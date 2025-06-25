-- SAFE Migration: Fix all tables to include user_id and proper RLS policies
-- This is a safer version that handles foreign key constraints properly

-- ===== STEP 1: ADD USER_ID COLUMNS =====

-- Add user_id to debts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'user_id') THEN
        ALTER TABLE debts ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id to expenses table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id to clients table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'user_id') THEN
        ALTER TABLE clients ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id to documents table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'user_id') THEN
        ALTER TABLE documents ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ===== STEP 2: UPDATE EXISTING DATA =====

-- Update debts based on car ownership
UPDATE debts 
SET user_id = cars.user_id 
FROM cars 
WHERE debts.car_id = cars.id 
AND debts.user_id IS NULL;

-- Update expenses based on car ownership
UPDATE expenses 
SET user_id = cars.user_id 
FROM cars 
WHERE expenses.car_id = cars.id 
AND expenses.user_id IS NULL;

-- Update clients based on cars that reference them
UPDATE clients 
SET user_id = cars.user_id 
FROM cars 
WHERE clients.id = cars.client_id 
AND clients.user_id IS NULL;

-- Update documents based on car ownership
UPDATE documents 
SET user_id = cars.user_id 
FROM cars 
WHERE documents.car_id = cars.id 
AND documents.user_id IS NULL;

-- ===== STEP 3: HANDLE ORPHANED RECORDS =====

-- Get the first user to assign orphaned records
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Assign orphaned records to first user
        UPDATE debts SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE expenses SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE clients SET user_id = first_user_id WHERE user_id IS NULL;
        UPDATE documents SET user_id = first_user_id WHERE user_id IS NULL;
    ELSE
        -- If no users exist, delete orphaned records
        DELETE FROM debts WHERE user_id IS NULL;
        DELETE FROM expenses WHERE user_id IS NULL;
        DELETE FROM documents WHERE user_id IS NULL;
        DELETE FROM clients WHERE user_id IS NULL;
    END IF;
END $$;

-- ===== STEP 4: MAKE USER_ID NOT NULL =====

ALTER TABLE debts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;

-- ===== STEP 5: DROP OLD RLS POLICIES =====

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debts;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON debt_payments;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON documents;

-- ===== STEP 6: CREATE PROPER RLS POLICIES =====

-- Debts policies
CREATE POLICY "Users can view own debts" ON debts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON debts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON debts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON debts FOR DELETE USING (auth.uid() = user_id);

-- Debt payments policies
CREATE POLICY "Users can view own debt payments" ON debt_payments 
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));
CREATE POLICY "Users can insert own debt payments" ON debt_payments 
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));
CREATE POLICY "Users can update own debt payments" ON debt_payments 
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));
CREATE POLICY "Users can delete own debt payments" ON debt_payments 
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM debts WHERE id = debt_id));

-- Expenses policies
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Clients policies
CREATE POLICY "Users can view own clients" ON clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON clients FOR DELETE USING (auth.uid() = user_id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- ===== STEP 7: CREATE INDEXES =====

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
