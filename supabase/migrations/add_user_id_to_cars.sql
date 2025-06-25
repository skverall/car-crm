-- Migration: Add user_id to cars table
-- This migration adds user_id field to the cars table to ensure each car is associated with a specific user

-- Step 1: Add user_id column to cars table
ALTER TABLE cars ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: For existing cars without user_id, we need to assign them to a user
-- Since we can't know which user they belong to, we'll need to handle this manually
-- For now, we'll set a constraint that user_id cannot be null for new records
-- Existing records will need to be updated manually or deleted

-- Step 3: Drop and recreate the car_profit_analysis view to include user_id
DROP VIEW IF EXISTS car_profit_analysis;

CREATE VIEW car_profit_analysis AS
SELECT 
    c.id,
    c.user_id,
    c.vin,
    c.make,
    c.model,
    c.year,
    c.status,
    c.purchase_price,
    c.purchase_currency,
    c.sale_price,
    c.sale_currency,
    COALESCE(SUM(e.amount * CASE 
        WHEN e.currency = 'AED' THEN 1
        WHEN e.currency = 'USD' THEN 3.67
        WHEN e.currency = 'EUR' THEN 4.00
        WHEN e.currency = 'GBP' THEN 4.60
        ELSE 1
    END), 0) AS total_expenses_aed,
    CASE 
        WHEN c.status = 'sold' THEN 
            (c.sale_price * CASE 
                WHEN c.sale_currency = 'AED' THEN 1
                WHEN c.sale_currency = 'USD' THEN 3.67
                WHEN c.sale_currency = 'EUR' THEN 4.00
                WHEN c.sale_currency = 'GBP' THEN 4.60
                ELSE 1
            END) - 
            (c.purchase_price * CASE 
                WHEN c.purchase_currency = 'AED' THEN 1
                WHEN c.purchase_currency = 'USD' THEN 3.67
                WHEN c.purchase_currency = 'EUR' THEN 4.00
                WHEN c.purchase_currency = 'GBP' THEN 4.60
                ELSE 1
            END) - 
            COALESCE(SUM(e.amount * CASE 
                WHEN e.currency = 'AED' THEN 1
                WHEN e.currency = 'USD' THEN 3.67
                WHEN e.currency = 'EUR' THEN 4.00
                WHEN e.currency = 'GBP' THEN 4.60
                ELSE 1
            END), 0)
        ELSE NULL
    END AS profit_aed,
    c.purchase_date,
    c.sale_date,
    CASE 
        WHEN c.status = 'sold' AND c.sale_date IS NOT NULL THEN 
            c.sale_date - c.purchase_date
        ELSE NULL
    END AS days_to_sell
FROM cars c
LEFT JOIN expenses e ON c.id = e.car_id
GROUP BY c.id, c.user_id, c.vin, c.make, c.model, c.year, c.status, 
         c.purchase_price, c.purchase_currency, c.sale_price, c.sale_currency,
         c.purchase_date, c.sale_date;

-- Step 4: Add Row Level Security policy for cars table
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own cars
CREATE POLICY "Users can view own cars" ON cars
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own cars
CREATE POLICY "Users can insert own cars" ON cars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cars
CREATE POLICY "Users can update own cars" ON cars
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own cars
CREATE POLICY "Users can delete own cars" ON cars
    FOR DELETE USING (auth.uid() = user_id);

-- Step 5: After running this migration, you'll need to either:
-- 1. Delete all existing cars (if test data): DELETE FROM cars WHERE user_id IS NULL;
-- 2. Or assign existing cars to specific users manually
-- 3. Then make user_id NOT NULL: ALTER TABLE cars ALTER COLUMN user_id SET NOT NULL;

-- For now, we'll leave user_id as nullable to avoid breaking existing data
-- But new cars will require user_id due to the application logic
