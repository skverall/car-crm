-- Simple migration to add user isolation
-- Run this step by step in Supabase SQL Editor

-- Step 1: Add user_id column to cars table (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cars' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE cars ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 2: Delete any existing cars without user_id (test data cleanup)
DELETE FROM cars WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL
ALTER TABLE cars ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Drop and recreate car_profit_analysis view with user_id
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

-- Step 5: Enable Row Level Security
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
CREATE POLICY "Users can view own cars" ON cars
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cars" ON cars
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cars" ON cars
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cars" ON cars
    FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'importer',
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policy for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- Step 10: Create or update user profile for current user (if logged in)
-- This will be handled by the application
