# Migration Guide - User Roles Update

## Overview
This migration adds user role functionality to the Car CRM system, allowing users to register as either Importers or Exporters with different dashboard experiences.

## Database Changes

### 1. New Enum Type
- Added `user_role` enum with values: `'importer'`, `'exporter'`

### 2. New Table: user_profiles
- `id` (UUID) - References auth.users(id)
- `role` (user_role) - User's business role
- `full_name` (VARCHAR) - User's full name
- `company_name` (VARCHAR) - Optional company name
- `phone` (VARCHAR) - Optional phone number
- `created_at`, `updated_at` (TIMESTAMP)

### 3. Automatic Profile Creation
- Added trigger function `handle_new_user()` that automatically creates a user profile when a new user registers
- Profile data is populated from user metadata

## How to Apply Migration

### Option 1: Apply to Existing Database
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20241225_add_user_roles.sql`
4. Run the SQL script

### Option 2: Fresh Database Setup
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Run the SQL script (this includes all tables and the new user roles functionality)

## New Features Added

### 1. Vehicle Deletion
- Added delete button in CarDetailModal
- Confirmation dialog before deletion
- Cascading deletion of expenses and documents
- Located in: `src/components/CarDetailModal.tsx`

### 2. Simplified Registration
- No email confirmation required
- Automatic user creation with confirmed email
- API endpoint: `/api/auth/register`
- Located in: `src/components/AuthForm.tsx`, `src/app/api/auth/register/route.ts`

### 3. Role Selection During Registration
- Users can choose between Importer and Exporter roles
- Role affects dashboard experience
- Form fields: Full Name, Email, Password, Role
- Located in: `src/components/AuthForm.tsx`

### 4. Role-Based Dashboards
- **Importer Dashboard**: Original dashboard focused on buying/selling
- **Exporter Dashboard**: New dashboard focused on export operations
- Different metrics and terminology
- Located in: `src/components/Dashboard.tsx`, `src/components/ExporterDashboard.tsx`

### 5. User Profile Management
- Hook for fetching user profile: `src/hooks/useUserProfile.ts`
- Automatic profile creation for existing users
- Role indicator in navigation

## Dashboard Differences

### Importer Dashboard
- Focus on purchase/sale operations
- Profit tracking
- Local market terminology

### Exporter Dashboard
- Focus on export operations
- Inventory value tracking
- Export-specific metrics:
  - Ready for Export
  - In Transit
  - Average Export Time
  - Export Status Overview

## Testing the Changes

1. **Test Vehicle Deletion**:
   - Open any vehicle detail
   - Click the red trash icon
   - Confirm deletion
   - Verify vehicle and related data are removed

2. **Test Simplified Registration**:
   - Go to registration page
   - Fill in: Full Name, Email, Password, Role
   - Submit form
   - Should automatically log in without email confirmation

3. **Test Role-Based Dashboards**:
   - Register as Exporter
   - Verify different dashboard layout and metrics
   - Check navigation shows "Export Dashboard" and "Export Inventory"

## Rollback Instructions

If you need to rollback these changes:

```sql
-- Remove trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Remove user_profiles table
DROP TABLE IF EXISTS user_profiles;

-- Remove user_role enum
DROP TYPE IF EXISTS user_role;
```

## Notes

- Existing users will automatically get 'importer' role
- Demo user (aydmaxx@gmail.com) is set as importer
- All RLS policies are maintained for security
- Backward compatibility is preserved
