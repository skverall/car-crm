-- URGENT DATA ISOLATION FIX
-- This migration immediately fixes the critical data isolation bug
-- where all authenticated users can see all data from other users

-- ===== STEP 1: DROP DANGEROUS POLICIES =====

-- Drop the dangerous "allow all" policies that expose all user data
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON cars;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;

-- ===== STEP 2: ENSURE USER_ID COLUMNS EXIST =====

-- Add user_id to clients table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to clients table';
    END IF;
END $$;

-- Add user_id to expenses table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to expenses table';
    END IF;
END $$;

-- Add user_id to documents table if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added user_id column to documents table';
    END IF;
END $$;

-- ===== STEP 3: UPDATE EXISTING DATA =====

-- Update clients - assign to demo user if exists, otherwise first user
DO $$
DECLARE
    demo_user_id UUID;
    first_user_id UUID;
BEGIN
    -- Try to find demo user first
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'aydmaxx@gmail.com' LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        UPDATE clients SET user_id = demo_user_id WHERE user_id IS NULL;
        RAISE NOTICE 'Updated clients user_id assignments to demo user: %', demo_user_id;
    ELSE
        -- Fallback to first user
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

-- Update expenses to assign them to users based on their associated cars
UPDATE expenses
SET user_id = cars.user_id
FROM cars
WHERE expenses.car_id = cars.id
AND expenses.user_id IS NULL;

-- For general expenses without cars, assign to demo user or delete
DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'aydmaxx@gmail.com' LIMIT 1;
    
    IF demo_user_id IS NOT NULL THEN
        UPDATE expenses SET user_id = demo_user_id WHERE user_id IS NULL;
        RAISE NOTICE 'Updated orphaned expenses to demo user';
    ELSE
        DELETE FROM expenses WHERE user_id IS NULL;
        RAISE NOTICE 'Deleted orphaned expenses';
    END IF;
END $$;

-- Update documents to assign them to users based on their associated cars
UPDATE documents
SET user_id = cars.user_id
FROM cars
WHERE documents.car_id = cars.id
AND documents.user_id IS NULL;

-- Delete orphaned documents
DELETE FROM documents WHERE user_id IS NULL;

-- ===== STEP 4: MAKE USER_ID NOT NULL =====

-- Make user_id NOT NULL for all tables
ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- ===== STEP 5: CREATE SECURE RLS POLICIES =====

-- Cars policies (user_id already exists and has proper policies)
CREATE POLICY "Users can view own cars" ON cars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cars" ON cars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cars" ON cars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cars" ON cars FOR DELETE USING (auth.uid() = user_id);

-- Clients policies
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- ===== STEP 6: CREATE INDEXES FOR PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- ===== FINAL STATUS =====

DO $$
BEGIN
    RAISE NOTICE '=== URGENT DATA ISOLATION FIX COMPLETED ===';
    RAISE NOTICE 'Removed dangerous "allow all" policies';
    RAISE NOTICE 'Created secure user-specific RLS policies';
    RAISE NOTICE 'Each user can now only see their own data';
    RAISE NOTICE 'Demo login will no longer see other users data';
END $$;
