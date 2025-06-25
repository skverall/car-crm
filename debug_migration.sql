-- Debug script to check migration status
-- Run this in Supabase SQL Editor to check if migration was applied

-- 1. Check if user_id column exists in cars table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cars' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if car_profit_analysis view includes user_id
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'car_profit_analysis' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if user_profiles table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'user_profiles';

-- 4. Check existing policies on cars table
SELECT policyname, cmd, permissive
FROM pg_policies
WHERE tablename = 'cars' AND schemaname = 'public';

-- 5. Count total cars (if table exists)
SELECT COUNT(*) as total_cars FROM cars;

-- 6. Check current user
SELECT auth.uid() as current_user_id;
