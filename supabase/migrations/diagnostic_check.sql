-- DIAGNOSTIC CHECK FOR DATA ISOLATION ISSUES
-- Run this in Supabase SQL Editor to check current database state
-- This will help identify what needs to be fixed

-- ===== CHECK TABLE EXISTENCE =====
SELECT 
    'TABLE EXISTENCE CHECK' as check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cars', 'expenses', 'debts', 'clients', 'documents', 'user_profiles')
ORDER BY table_name;

-- ===== CHECK USER_ID COLUMNS =====
SELECT 
    'USER_ID COLUMN CHECK' as check_type,
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN 'HAS user_id'
        ELSE 'MISSING user_id'
    END as status,
    c.data_type,
    c.is_nullable
FROM (
    SELECT 'cars' as table_name
    UNION SELECT 'expenses'
    UNION SELECT 'debts' 
    UNION SELECT 'clients'
    UNION SELECT 'documents'
) t
LEFT JOIN information_schema.columns c ON c.table_name = t.table_name 
    AND c.column_name = 'user_id' 
    AND c.table_schema = 'public'
ORDER BY t.table_name;

-- ===== CHECK ROW LEVEL SECURITY STATUS =====
SELECT 
    'RLS STATUS CHECK' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cars', 'expenses', 'debts', 'clients', 'documents', 'user_profiles')
ORDER BY tablename;

-- ===== CHECK RLS POLICIES =====
SELECT 
    'RLS POLICIES CHECK' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd as command_type,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('cars', 'expenses', 'debts', 'clients', 'documents', 'user_profiles')
ORDER BY tablename, policyname;

-- ===== CHECK DATA COUNTS =====
DO $$
DECLARE
    rec RECORD;
    sql_text TEXT;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '=== DATA COUNT CHECK ===';
    
    -- Check each table for data counts
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('cars', 'expenses', 'debts', 'clients', 'documents')
    LOOP
        sql_text := 'SELECT COUNT(*) FROM ' || rec.table_name;
        EXECUTE sql_text INTO result_count;
        RAISE NOTICE 'Table %: % records', rec.table_name, result_count;
    END LOOP;
END $$;

-- ===== CHECK FOR ORPHANED DATA =====
DO $$
DECLARE
    rec RECORD;
    sql_text TEXT;
    result_count INTEGER;
BEGIN
    RAISE NOTICE '=== ORPHANED DATA CHECK ===';
    
    -- Check for records without user_id in each table
    FOR rec IN 
        SELECT c.table_name 
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' 
        AND c.column_name = 'user_id'
        AND c.table_name IN ('cars', 'expenses', 'debts', 'clients', 'documents')
    LOOP
        sql_text := 'SELECT COUNT(*) FROM ' || rec.table_name || ' WHERE user_id IS NULL';
        EXECUTE sql_text INTO result_count;
        RAISE NOTICE 'Table % has % records with NULL user_id', rec.table_name, result_count;
    END LOOP;
    
    -- Check for records with user_id in tables that might not have the column
    FOR rec IN 
        SELECT t.table_name
        FROM (
            SELECT 'expenses' as table_name
            UNION SELECT 'debts'
            UNION SELECT 'clients'
            UNION SELECT 'documents'
        ) t
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns c
            WHERE c.table_name = t.table_name 
            AND c.column_name = 'user_id'
            AND c.table_schema = 'public'
        )
    LOOP
        sql_text := 'SELECT COUNT(*) FROM ' || rec.table_name;
        EXECUTE sql_text INTO result_count;
        RAISE NOTICE 'Table % (missing user_id) has % total records that need user assignment', rec.table_name, result_count;
    END LOOP;
END $$;

-- ===== CHECK USER ACCOUNTS =====
SELECT 
    'USER ACCOUNTS CHECK' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN email_confirmed_at IS NOT NULL THEN 1 END) as confirmed_users
FROM auth.users;

-- ===== CHECK USER PROFILES =====
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO profile_count FROM user_profiles;
        RAISE NOTICE 'Users: %, User Profiles: %', user_count, profile_count;
    ELSE
        RAISE NOTICE 'Users: %, User Profiles table: MISSING', user_count;
    END IF;
END $$;

-- ===== SUMMARY RECOMMENDATIONS =====
DO $$
BEGIN
    RAISE NOTICE '=== SUMMARY AND RECOMMENDATIONS ===';
    RAISE NOTICE '1. Check if all required tables exist';
    RAISE NOTICE '2. Verify user_id columns exist in all tables';
    RAISE NOTICE '3. Confirm RLS is enabled on all tables';
    RAISE NOTICE '4. Check if proper RLS policies are in place';
    RAISE NOTICE '5. Look for orphaned data without user_id';
    RAISE NOTICE '6. If issues found, run the comprehensive fix migration';
END $$;
