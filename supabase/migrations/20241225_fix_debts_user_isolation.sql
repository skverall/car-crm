-- Migration: Fix all tables to include user_id and proper RLS policies
-- This migration adds user_id fields and updates RLS policies for debts, expenses, clients, and documents

-- ===== DEBTS TABLE =====
-- Step 1: Add user_id column to debts table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'user_id') THEN
        ALTER TABLE debts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Update existing debts to assign them to users based on their associated cars
UPDATE debts
SET user_id = cars.user_id
FROM cars
WHERE debts.car_id = cars.id
AND debts.user_id IS NULL;

-- Step 3: For debts without associated cars, delete orphaned debts
DELETE FROM debts WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL after cleaning up data
ALTER TABLE debts ALTER COLUMN user_id SET NOT NULL;

-- ===== EXPENSES TABLE =====
-- Step 5: Add user_id column to expenses table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 6: Update existing expenses to assign them to users based on their associated cars
UPDATE expenses
SET user_id = cars.user_id
FROM cars
WHERE expenses.car_id = cars.id
AND expenses.user_id IS NULL;

-- Step 7: For general expenses without cars, we need to handle them manually
-- For now, delete orphaned expenses
DELETE FROM expenses WHERE user_id IS NULL;

-- Step 8: Make user_id NOT NULL for expenses
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;

-- ===== CLIENTS TABLE =====
-- Step 9: Add user_id column to clients table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id') THEN
        ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 10: Update existing clients to assign them to users based on cars that reference them
UPDATE clients
SET user_id = cars.user_id
FROM cars
WHERE clients.id = cars.client_id
AND clients.user_id IS NULL;

-- Step 11: For clients not referenced by any cars, we need to assign them to a user
-- Since we can't determine ownership, we'll assign them to the first available user
-- or delete them if no users exist
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get the first user ID
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;

    IF first_user_id IS NOT NULL THEN
        -- Assign orphaned clients to the first user
        UPDATE clients SET user_id = first_user_id WHERE user_id IS NULL;
    ELSE
        -- If no users exist, delete orphaned clients
        DELETE FROM clients WHERE user_id IS NULL;
    END IF;
END $$;

-- Step 12: Make user_id NOT NULL for clients
ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;

-- ===== DOCUMENTS TABLE =====
-- Step 13: Add user_id column to documents table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id') THEN
        ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 14: Update existing documents to assign them to users based on their associated cars
UPDATE documents
SET user_id = cars.user_id
FROM cars
WHERE documents.car_id = cars.id
AND documents.user_id IS NULL;

-- Step 15: Delete orphaned documents
DELETE FROM documents WHERE user_id IS NULL;

-- Step 16: Make user_id NOT NULL for documents
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- ===== DROP OLD RLS POLICIES =====
-- Step 17: Drop existing incorrect RLS policies
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debt_payments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;

-- ===== CREATE PROPER RLS POLICIES =====
-- Step 18: Create proper RLS policies for debts
CREATE POLICY "Users can view own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

-- Step 19: Create proper RLS policies for debt_payments
CREATE POLICY "Users can view own debt payments" ON debt_payments
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));

CREATE POLICY "Users can insert own debt payments" ON debt_payments
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));

CREATE POLICY "Users can update own debt payments" ON debt_payments
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));

CREATE POLICY "Users can delete own debt payments" ON debt_payments
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));

-- Step 20: Create proper RLS policies for expenses
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- Step 21: Create proper RLS policies for clients
CREATE POLICY "Users can view own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- Step 22: Create proper RLS policies for documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- ===== CREATE INDEXES =====
-- Step 23: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
