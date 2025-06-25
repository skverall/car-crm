# Migration Guide - User Data Isolation

## Overview
This migration fixes a critical issue where all users could see each other's vehicles. Now each user can only see and manage their own vehicles and related data.

## Previous Issue
- All vehicles were visible to all users
- No data isolation between user accounts
- Security vulnerability

## Solution
- Added `user_id` field to `cars` table
- Updated all components to filter by current user
- Added Row Level Security policies

## Database Changes

### 1. Added user_id to cars table
- `user_id` (UUID) - References auth.users(id) ON DELETE CASCADE
- Links each vehicle to its owner

### 2. Updated car_profit_analysis view
- Added `user_id` field to the view
- Maintains compatibility with existing queries

### 3. Row Level Security (RLS)
- Enabled RLS on cars table
- Added policies for SELECT, INSERT, UPDATE, DELETE
- Users can only access their own vehicles

## How to Apply Migration

### Step 1: Apply Database Migration
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/add_user_id_to_cars.sql`
4. Run the SQL script

### Step 2: Handle Existing Data
Choose one of these options:

#### Option A: Delete existing test data
```sql
DELETE FROM cars WHERE user_id IS NULL;
```

#### Option B: Assign existing cars to a specific user
```sql
-- Find user ID
SELECT id, email FROM auth.users;

-- Assign cars to user
UPDATE cars SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;
```

### Step 3: Make user_id required (optional)
```sql
ALTER TABLE cars ALTER COLUMN user_id SET NOT NULL;
```

## Updated Components

### Core Components
- ✅ `AddCarModal.tsx` - Adds user_id when creating vehicles
- ✅ `InventoryPage.tsx` - Filters vehicles by user_id
- ✅ `Dashboard.tsx` - Shows only user's vehicles
- ✅ `ExporterDashboard.tsx` - Shows only user's vehicles
- ✅ `CarDetailModal.tsx` - Checks vehicle ownership
- ✅ `EditCarModal.tsx` - Checks vehicle ownership
- ✅ `SaleModal.tsx` - Checks vehicle ownership
- ✅ `AnalyticsModal.tsx` - Filters analytics by user_id

### Finance & Expense Components
- ✅ `FinancePage.tsx` - Filters cars and expenses by user_id
- ✅ `AddExpenseModalAdvanced.tsx` - Shows only user's cars
- ✅ `ExpenseDetailModal.tsx` - Checks expense ownership

### Debt Components
- ✅ `DebtsPage.tsx` - Filters debts by user_id
- ✅ `AddDebtModal.tsx` - Shows only user's cars

### Type Definitions
- ✅ `database.ts` - Added user_id to Car and CarProfitAnalysis interfaces

## Testing the Fix

1. **Create two user accounts**:
   - Register first user (e.g., user1@example.com)
   - Register second user (e.g., user2@example.com)

2. **Test data isolation**:
   - Login as user1, add some vehicles
   - Login as user2, verify inventory is empty
   - Add vehicles as user2
   - Switch back to user1, verify only user1's vehicles are visible

3. **Test all functionality**:
   - Vehicle creation, editing, deletion
   - Expense management
   - Debt tracking
   - Analytics and reports

## Security Features

- **Row Level Security**: Database-level protection ensures users can only access their own data
- **Application-level filtering**: All queries filter by user_id
- **Ownership validation**: All update/delete operations verify ownership

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Remove RLS policies
DROP POLICY IF EXISTS "Users can view own cars" ON cars;
DROP POLICY IF EXISTS "Users can insert own cars" ON cars;
DROP POLICY IF EXISTS "Users can update own cars" ON cars;
DROP POLICY IF EXISTS "Users can delete own cars" ON cars;

-- Disable RLS
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;

-- Remove user_id column
ALTER TABLE cars DROP COLUMN IF EXISTS user_id;

-- Recreate original view
DROP VIEW IF EXISTS car_profit_analysis;
-- (recreate original view without user_id)
```

## Important Notes

- **Data Loss Warning**: Applying this migration may require handling existing data
- **Backup Recommended**: Always backup your database before applying migrations
- **Test Environment**: Test the migration in a development environment first
- **User Communication**: Inform users about the data isolation changes
