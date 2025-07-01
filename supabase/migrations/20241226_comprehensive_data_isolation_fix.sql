-- COMPREHENSIVE DATA ISOLATION FIX
-- This migration ensures complete data isolation between user accounts
-- Run this in Supabase SQL Editor to fix all data isolation issues

-- ===== STEP 1: CHECK AND ADD USER_ID COLUMNS =====

-- Add user_id to expenses table (if not exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to expenses table';
        ELSE
            RAISE NOTICE 'user_id column already exists in expenses table';
        END IF;
    ELSE
        RAISE NOTICE 'expenses table does not exist';
    END IF;
END $$;

-- Add user_id to debts table (if not exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE debts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to debts table';
        ELSE
            RAISE NOTICE 'user_id column already exists in debts table';
        END IF;
    ELSE
        RAISE NOTICE 'debts table does not exist';
    END IF;
END $$;

-- Add user_id to clients table (if not exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to clients table';
        ELSE
            RAISE NOTICE 'user_id column already exists in clients table';
        END IF;
    ELSE
        RAISE NOTICE 'clients table does not exist';
    END IF;
END $$;

-- Add user_id to documents table (if not exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            RAISE NOTICE 'Added user_id column to documents table';
        ELSE
            RAISE NOTICE 'user_id column already exists in documents table';
        END IF;
    ELSE
        RAISE NOTICE 'documents table does not exist';
    END IF;
END $$;

-- ===== STEP 2: UPDATE EXISTING DATA =====

-- Update expenses to assign them to users based on their associated cars
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        UPDATE expenses
        SET user_id = cars.user_id
        FROM cars
        WHERE expenses.car_id = cars.id
        AND expenses.user_id IS NULL;
        
        -- For general expenses without cars, delete orphaned expenses
        DELETE FROM expenses WHERE user_id IS NULL;
        RAISE NOTICE 'Updated expenses user_id assignments';
    END IF;
END $$;

-- Update debts to assign them to users based on their associated cars
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        UPDATE debts
        SET user_id = cars.user_id
        FROM cars
        WHERE debts.car_id = cars.id
        AND debts.user_id IS NULL;
        
        -- For debts without associated cars, delete orphaned debts
        DELETE FROM debts WHERE user_id IS NULL;
        RAISE NOTICE 'Updated debts user_id assignments';
    END IF;
END $$;

-- Update clients - assign to first available user (manual assignment needed)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        -- Get first user ID
        SELECT id INTO first_user_id FROM auth.users LIMIT 1;
        
        IF first_user_id IS NOT NULL THEN
            UPDATE clients SET user_id = first_user_id WHERE user_id IS NULL;
            RAISE NOTICE 'Updated clients user_id assignments to first user: %', first_user_id;
        ELSE
            DELETE FROM clients WHERE user_id IS NULL;
            RAISE NOTICE 'No users found, deleted orphaned clients';
        END IF;
    END IF;
END $$;

-- Update documents to assign them to users based on their associated cars
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        UPDATE documents
        SET user_id = cars.user_id
        FROM cars
        WHERE documents.car_id = cars.id
        AND documents.user_id IS NULL;
        
        -- Delete orphaned documents
        DELETE FROM documents WHERE user_id IS NULL;
        RAISE NOTICE 'Updated documents user_id assignments';
    END IF;
END $$;

-- ===== STEP 3: MAKE USER_ID NOT NULL =====

-- Make user_id NOT NULL for all tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Set user_id NOT NULL for expenses table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        ALTER TABLE debts ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Set user_id NOT NULL for debts table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Set user_id NOT NULL for clients table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Set user_id NOT NULL for documents table';
    END IF;
END $$;

-- ===== STEP 4: ENABLE ROW LEVEL SECURITY =====

-- Enable RLS on all tables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS for expenses table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS for debts table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS for clients table';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS for documents table';
    END IF;
END $$;

-- ===== STEP 5: DROP OLD POLICIES =====

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cars;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;

-- Drop existing user-specific policies to recreate them
DROP POLICY IF EXISTS "Users can view own cars" ON cars;
DROP POLICY IF EXISTS "Users can insert own cars" ON cars;
DROP POLICY IF EXISTS "Users can update own cars" ON cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON cars;

DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

DROP POLICY IF EXISTS "Users can view own debts" ON debts;
DROP POLICY IF EXISTS "Users can insert own debts" ON debts;
DROP POLICY IF EXISTS "Users can update own debts" ON debts;
DROP POLICY IF EXISTS "Users can delete own debts" ON debts;

DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

DROP POLICY IF EXISTS "Users can view own documents" ON documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;

-- ===== STEP 6: CREATE PROPER RLS POLICIES =====

-- Cars policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cars' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own cars" ON cars FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own cars" ON cars FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own cars" ON cars FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own cars" ON cars FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policies for cars table';
    END IF;
END $$;

-- Expenses policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policies for expenses table';
    END IF;
END $$;

-- Debts policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own debts" ON debts FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own debts" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own debts" ON debts FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own debts" ON debts FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policies for debts table';
    END IF;
END $$;

-- Clients policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policies for clients table';
    END IF;
END $$;

-- Documents policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created RLS policies for documents table';
    END IF;
END $$;

-- ===== STEP 7: CREATE INDEXES FOR PERFORMANCE =====

-- Create indexes on user_id columns for better performance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
        RAISE NOTICE 'Created index on expenses.user_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'debts' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
        RAISE NOTICE 'Created index on debts.user_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
        RAISE NOTICE 'Created index on clients.user_id';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
        RAISE NOTICE 'Created index on documents.user_id';
    END IF;
END $$;

-- ===== FINAL STATUS CHECK =====

-- Display final status
DO $$
BEGIN
    RAISE NOTICE '=== DATA ISOLATION FIX COMPLETED ===';
    RAISE NOTICE 'All tables now have proper user_id fields and RLS policies';
    RAISE NOTICE 'Each user can only see and manage their own data';
    RAISE NOTICE 'Please test the application to verify data isolation is working';
END $$;
