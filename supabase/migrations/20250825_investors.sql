-- Migration: Add investors, car_investors, investor_transactions, extra_income
-- and extend analytics views. Also align roles.

-- 1) Align roles enum (add admin to match frontend types)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- 2) Investor transaction type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'investor_tx_type') THEN
    CREATE TYPE investor_tx_type AS ENUM ('contribution','distribution','extra_income','expense');
  END IF;
END $$;

-- 3) Investors table
CREATE TABLE IF NOT EXISTS investors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  initial_capital NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Car investors (share ownership per car)
CREATE TABLE IF NOT EXISTS car_investors (
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  share NUMERIC(7,6) NOT NULL CHECK (share >= 0 AND share <= 1),
  capital_contribution NUMERIC(14,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (car_id, investor_id)
);

-- 5) Investor transactions (cash movements and allocations)
CREATE TABLE IF NOT EXISTS investor_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  tx_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency currency_type NOT NULL DEFAULT 'AED',
  tx_type investor_tx_type NOT NULL,
  note TEXT
);

-- 6) Extra income (optionally linked to car or investor)
CREATE TABLE IF NOT EXISTS extra_income (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  income_date DATE NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency currency_type NOT NULL DEFAULT 'AED',
  car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
  investor_id UUID REFERENCES investors(id) ON DELETE SET NULL,
  note TEXT
);

-- 6.1) Expenses: add investor_id to link expenses to investors when applicable
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS investor_id UUID REFERENCES investors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_investor_id ON expenses(investor_id);

-- 7) Indexes
CREATE INDEX IF NOT EXISTS idx_car_investors_investor ON car_investors(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_tx_investor_date ON investor_transactions(investor_id, tx_date);
CREATE INDEX IF NOT EXISTS idx_extra_income_refs_date ON extra_income(car_id, investor_id, income_date);

-- 8) RLS enablement
ALTER TABLE investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_income ENABLE ROW LEVEL SECURITY;

-- 9) Simple permissive policies for MVP (tighten later)
CREATE POLICY IF NOT EXISTS inv_all_auth ON investors
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS ci_all_auth ON car_investors
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS itx_all_auth ON investor_transactions
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY IF NOT EXISTS einc_all_auth ON extra_income
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- 10) Recreate car_profit_analysis to include photo_url and extra_income impact
DROP VIEW IF EXISTS car_profit_analysis;
CREATE VIEW car_profit_analysis AS
WITH expense_sum AS (
  SELECT e.car_id,
         COALESCE(SUM(e.amount * CASE e.currency
           WHEN 'AED' THEN 1 WHEN 'USD' THEN 3.67 WHEN 'EUR' THEN 4.00 WHEN 'GBP' THEN 4.60 ELSE 1 END), 0) AS total_expenses_aed
  FROM expenses e
  GROUP BY e.car_id
), extra_income_sum AS (
  SELECT ei.car_id,
         COALESCE(SUM(ei.amount * CASE ei.currency
           WHEN 'AED' THEN 1 WHEN 'USD' THEN 3.67 WHEN 'EUR' THEN 4.00 WHEN 'GBP' THEN 4.60 ELSE 1 END), 0) AS extra_income_aed
  FROM extra_income ei
  WHERE ei.car_id IS NOT NULL
  GROUP BY ei.car_id
)
SELECT
  c.id,
  c.user_id,
  c.vin,
  c.make,
  c.model,
  c.year,
  c.status,
  c.photo_url,
  c.purchase_price,
  c.purchase_currency,
  c.sale_price,
  c.sale_currency,
  COALESCE(es.total_expenses_aed, 0) AS total_expenses_aed,
  CASE
    WHEN c.status = 'sold' THEN
      (c.sale_price * CASE c.sale_currency
        WHEN 'AED' THEN 1 WHEN 'USD' THEN 3.67 WHEN 'EUR' THEN 4.00 WHEN 'GBP' THEN 4.60 ELSE 1 END)
      - (c.purchase_price * CASE c.purchase_currency
        WHEN 'AED' THEN 1 WHEN 'USD' THEN 3.67 WHEN 'EUR' THEN 4.00 WHEN 'GBP' THEN 4.60 ELSE 1 END)
      - COALESCE(es.total_expenses_aed, 0)
      + COALESCE(eis.extra_income_aed, 0)
    ELSE NULL
  END AS profit_aed,
  c.purchase_date,
  c.sale_date,
  CASE WHEN c.status = 'sold' AND c.sale_date IS NOT NULL THEN c.sale_date - c.purchase_date ELSE NULL END AS days_to_sell
FROM cars c
LEFT JOIN expense_sum es ON es.car_id = c.id
LEFT JOIN extra_income_sum eis ON eis.car_id = c.id;

COMMENT ON VIEW car_profit_analysis IS 'Profit analysis with expenses and extra income normalized to AED.';

-- 11) View: car_investor_pnl (profit allocation by shares)
DROP VIEW IF EXISTS car_investor_pnl;
CREATE VIEW car_investor_pnl AS
SELECT ci.investor_id,
       ci.car_id,
       (v.profit_aed * ci.share) AS investor_profit_aed
FROM car_investors ci
JOIN car_profit_analysis v ON v.id = ci.car_id
WHERE v.profit_aed IS NOT NULL;

-- 12) View: investor_balances (sheet-like rollup)
DROP VIEW IF EXISTS investor_balances;
CREATE VIEW investor_balances AS
WITH itx AS (
  SELECT investor_id,
         SUM(CASE WHEN tx_type = 'contribution' THEN amt_aed WHEN tx_type = 'distribution' THEN -amt_aed ELSE 0 END) AS net_flows_aed,
         SUM(CASE WHEN tx_type = 'extra_income' THEN amt_aed ELSE 0 END) AS extra_income_aed
  FROM (
    SELECT investor_id, tx_type,
           amount * CASE currency
             WHEN 'AED' THEN 1 WHEN 'USD' THEN 3.67 WHEN 'EUR' THEN 4.00 WHEN 'GBP' THEN 4.60 ELSE 1 END AS amt_aed
    FROM investor_transactions
  ) z
  GROUP BY investor_id
), pnl AS (
  SELECT investor_id, SUM(investor_profit_aed) AS realized_pnl_aed
  FROM car_investor_pnl
  GROUP BY investor_id
)
SELECT i.id AS investor_id,
       i.name,
       i.initial_capital AS initial_investment_aed,
       COALESCE(pnl.realized_pnl_aed, 0) AS realized_pnl_aed,
       COALESCE(itx.net_flows_aed, 0) AS net_flows_aed,
       COALESCE(itx.extra_income_aed, 0) AS extra_income_aed
FROM investors i
LEFT JOIN itx ON itx.investor_id = i.id
LEFT JOIN pnl ON pnl.investor_id = i.id;

-- 13) Notices
DO $$ BEGIN RAISE NOTICE 'Investors & finance migration applied'; END $$;
