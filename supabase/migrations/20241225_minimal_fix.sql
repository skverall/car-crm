-- MINIMAL Migration: Fix only existing tables for user isolation
-- This version only works with tables that actually exist

-- ===== CHECK AND ADD USER_ID COLUMNS =====

-- Add user_id to debts table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'user_id') THEN
            ALTER TABLE debts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add user_id to expenses table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
            ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add user_id to clients table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id') THEN
            ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- ===== UPDATE EXISTING DATA =====

-- Update debts based on car ownership (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars') THEN
        UPDATE debts 
        SET user_id = cars.user_id 
        FROM cars 
        WHERE debts.car_id = cars.id 
        AND debts.user_id IS NULL;
    END IF;
END $$;

-- Update expenses based on car ownership (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars') THEN
        UPDATE expenses 
        SET user_id = cars.user_id 
        FROM cars 
        WHERE expenses.car_id = cars.id 
        AND expenses.user_id IS NULL;
    END IF;
END $$;

-- Update clients based on cars that reference them (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') 
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars') THEN
        UPDATE clients 
        SET user_id = cars.user_id 
        FROM cars 
        WHERE clients.id = cars.client_id 
        AND clients.user_id IS NULL;
    END IF;
END $$;

-- ===== HANDLE ORPHANED RECORDS =====

-- Assign orphaned records to first user
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update debts
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
            UPDATE debts SET user_id = first_user_id WHERE user_id IS NULL;
        END IF;
        
        -- Update expenses
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
            UPDATE expenses SET user_id = first_user_id WHERE user_id IS NULL;
        END IF;
        
        -- Update clients
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
            UPDATE clients SET user_id = first_user_id WHERE user_id IS NULL;
        END IF;
    END IF;
END $$;

-- ===== MAKE USER_ID NOT NULL =====

-- Make user_id NOT NULL for existing tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
        ALTER TABLE debts ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
    END IF;
END $$;

-- ===== DROP OLD RLS POLICIES =====

-- Drop old policies only for existing tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
        DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debts;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
    END IF;
END $$;

-- ===== CREATE PROPER RLS POLICIES =====

-- Create policies only for existing tables

-- Debts policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
        CREATE POLICY "Users can view own debts" ON debts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own debts" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own debts" ON debts FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own debts" ON debts FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Expenses policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Clients policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ===== CREATE INDEXES =====

-- Create indexes only for existing tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts') THEN
        CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
    END IF;
END $$;
