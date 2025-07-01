-- CASH AND BANK TRANSACTION MANAGEMENT SYSTEM
-- This migration creates tables and types for comprehensive cash flow management

-- ===== STEP 1: CREATE ENUM TYPES =====

-- Transaction types for cash/bank operations
CREATE TYPE transaction_type AS ENUM (
    'deposit',           -- Money coming in
    'withdrawal',        -- Money going out
    'transfer',          -- Transfer between accounts
    'car_sale_payment',  -- Payment received from car sale
    'car_purchase_payment', -- Payment made for car purchase
    'expense_payment',   -- Payment for expenses
    'debt_payment',      -- Payment for debts
    'other'              -- Other transactions
);

-- Account types for different financial accounts
CREATE TYPE account_type AS ENUM (
    'cash',              -- Physical cash
    'bank_checking',     -- Bank checking account
    'bank_savings',      -- Bank savings account
    'credit_card',       -- Credit card account
    'other'              -- Other account types
);

-- Transaction status
CREATE TYPE transaction_status AS ENUM (
    'pending',           -- Transaction is pending
    'completed',         -- Transaction is completed
    'cancelled',         -- Transaction was cancelled
    'failed'             -- Transaction failed
);

-- ===== STEP 2: CREATE ACCOUNTS TABLE =====

-- Financial accounts (cash, bank accounts, etc.)
CREATE TABLE financial_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    account_type account_type NOT NULL,
    currency currency_type NOT NULL DEFAULT 'AED',
    initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    account_number VARCHAR(100), -- Bank account number, card number, etc.
    bank_name VARCHAR(255),      -- Bank name for bank accounts
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT financial_accounts_name_user_unique UNIQUE (name, user_id)
);

-- ===== STEP 3: CREATE TRANSACTIONS TABLE =====

-- Cash and bank transactions
CREATE TABLE cash_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    transaction_type transaction_type NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency currency_type NOT NULL DEFAULT 'AED',
    description TEXT NOT NULL,
    reference_number VARCHAR(100), -- Check number, transfer reference, etc.
    
    -- Related entities (optional)
    car_id UUID REFERENCES cars(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
    
    -- Transfer details (for transfer transactions)
    to_account_id UUID REFERENCES financial_accounts(id) ON DELETE SET NULL,
    
    -- Transaction details
    transaction_date DATE NOT NULL,
    status transaction_status NOT NULL DEFAULT 'completed',
    notes TEXT,
    receipt_url TEXT, -- URL to receipt/proof document
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CHECK (
        -- For transfers, to_account_id must be specified
        (transaction_type != 'transfer' OR to_account_id IS NOT NULL)
    ),
    CHECK (
        -- For transfers, to_account_id must be different from account_id
        (transaction_type != 'transfer' OR to_account_id != account_id)
    )
);

-- ===== STEP 4: CREATE ACCOUNT BALANCE HISTORY TABLE =====

-- Track balance changes over time for auditing
CREATE TABLE account_balance_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES cash_transactions(id) ON DELETE SET NULL,
    previous_balance DECIMAL(12,2) NOT NULL,
    new_balance DECIMAL(12,2) NOT NULL,
    balance_change DECIMAL(12,2) NOT NULL,
    change_reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== STEP 5: CREATE INDEXES =====

-- Performance indexes
CREATE INDEX idx_financial_accounts_user_id ON financial_accounts(user_id);
CREATE INDEX idx_financial_accounts_type ON financial_accounts(account_type);
CREATE INDEX idx_cash_transactions_user_id ON cash_transactions(user_id);
CREATE INDEX idx_cash_transactions_account_id ON cash_transactions(account_id);
CREATE INDEX idx_cash_transactions_type ON cash_transactions(transaction_type);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(transaction_date);
CREATE INDEX idx_cash_transactions_status ON cash_transactions(status);
CREATE INDEX idx_account_balance_history_account_id ON account_balance_history(account_id);

-- ===== STEP 6: CREATE TRIGGERS =====

-- Updated_at triggers
CREATE TRIGGER update_financial_accounts_updated_at 
    BEFORE UPDATE ON financial_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cash_transactions_updated_at 
    BEFORE UPDATE ON cash_transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== STEP 7: CREATE BALANCE UPDATE FUNCTION =====

-- Function to update account balance when transactions are added/modified
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    old_balance DECIMAL(12,2);
    new_balance DECIMAL(12,2);
    balance_change DECIMAL(12,2);
    change_reason TEXT;
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        -- Get current balance
        SELECT current_balance INTO old_balance 
        FROM financial_accounts 
        WHERE id = NEW.account_id;
        
        -- Calculate new balance based on transaction type
        IF NEW.transaction_type IN ('deposit', 'car_sale_payment') THEN
            balance_change := NEW.amount;
            change_reason := 'Transaction: ' || NEW.transaction_type || ' - ' || NEW.description;
        ELSIF NEW.transaction_type IN ('withdrawal', 'car_purchase_payment', 'expense_payment', 'debt_payment') THEN
            balance_change := -NEW.amount;
            change_reason := 'Transaction: ' || NEW.transaction_type || ' - ' || NEW.description;
        ELSIF NEW.transaction_type = 'transfer' THEN
            -- For transfers, subtract from source account
            balance_change := -NEW.amount;
            change_reason := 'Transfer out to account: ' || NEW.to_account_id;
        ELSE
            -- For 'other' type, determine based on context or default to withdrawal
            balance_change := -NEW.amount;
            change_reason := 'Transaction: ' || NEW.transaction_type || ' - ' || NEW.description;
        END IF;
        
        new_balance := old_balance + balance_change;
        
        -- Update account balance
        UPDATE financial_accounts 
        SET current_balance = new_balance 
        WHERE id = NEW.account_id;
        
        -- Record balance history
        INSERT INTO account_balance_history (
            account_id, transaction_id, previous_balance, 
            new_balance, balance_change, change_reason
        ) VALUES (
            NEW.account_id, NEW.id, old_balance, 
            new_balance, balance_change, change_reason
        );
        
        -- Handle transfer to destination account
        IF NEW.transaction_type = 'transfer' AND NEW.to_account_id IS NOT NULL THEN
            SELECT current_balance INTO old_balance 
            FROM financial_accounts 
            WHERE id = NEW.to_account_id;
            
            new_balance := old_balance + NEW.amount;
            
            UPDATE financial_accounts 
            SET current_balance = new_balance 
            WHERE id = NEW.to_account_id;
            
            INSERT INTO account_balance_history (
                account_id, transaction_id, previous_balance, 
                new_balance, balance_change, change_reason
            ) VALUES (
                NEW.to_account_id, NEW.id, old_balance, 
                new_balance, NEW.amount, 'Transfer in from account: ' || NEW.account_id
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE and DELETE would be more complex and should be handled carefully
    -- For now, we'll focus on INSERT operations
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for balance updates
CREATE TRIGGER trigger_update_account_balance
    AFTER INSERT ON cash_transactions
    FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- ===== STEP 8: ENABLE ROW LEVEL SECURITY =====

ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance_history ENABLE ROW LEVEL SECURITY;

-- ===== STEP 9: CREATE RLS POLICIES =====

-- Financial accounts policies
CREATE POLICY "Users can view own accounts" ON financial_accounts 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON financial_accounts 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON financial_accounts 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON financial_accounts 
    FOR DELETE USING (auth.uid() = user_id);

-- Cash transactions policies
CREATE POLICY "Users can view own transactions" ON cash_transactions 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON cash_transactions 
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON cash_transactions 
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON cash_transactions 
    FOR DELETE USING (auth.uid() = user_id);

-- Account balance history policies (read-only for users)
CREATE POLICY "Users can view own account history" ON account_balance_history 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM financial_accounts 
            WHERE financial_accounts.id = account_balance_history.account_id 
            AND financial_accounts.user_id = auth.uid()
        )
    );

-- ===== FINAL STATUS =====

DO $$
BEGIN
    RAISE NOTICE '=== CASH MANAGEMENT SYSTEM CREATED ===';
    RAISE NOTICE 'Created financial_accounts table for managing cash/bank accounts';
    RAISE NOTICE 'Created cash_transactions table for tracking all transactions';
    RAISE NOTICE 'Created account_balance_history for audit trail';
    RAISE NOTICE 'Added automatic balance calculation triggers';
    RAISE NOTICE 'Enabled proper user isolation with RLS policies';
END $$;
