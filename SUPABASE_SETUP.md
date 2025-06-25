# Supabase Setup Guide

This guide will help you set up Supabase for your Car CRM application.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended)
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: Car CRM
   - **Database Password**: Choose a strong password
   - **Region**: Choose closest to your location
7. Click "Create new project"

## 2. Get Your Project Credentials

1. Go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (something like `https://xxxxx.supabase.co`)
   - **Project API Key** (anon public key)
   - **Service Role Key** (keep this secret!)

## 3. Configure Environment Variables

1. In your project root, copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 4. Set Up Database Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `supabase/schema.sql`
3. Paste it into the SQL Editor
4. Click "Run" to execute the script

This will create:
- All necessary tables (cars, expenses, clients, documents, exchange_rates)
- Indexes for better performance
- Row Level Security (RLS) policies
- Views for analytics
- Triggers for automatic timestamps

## 5. Set Up Storage for Documents

1. Go to **Storage** in your Supabase dashboard
2. Click "Create a new bucket"
3. Bucket details:
   - **Name**: `documents`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty (allow all)
4. Click "Create bucket"

### Configure Storage Policies

1. Click on the `documents` bucket
2. Go to **Policies** tab
3. Click "New Policy"
4. Choose "Custom policy"
5. Add the following policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);
```

**Policy 2: Allow public access to view documents**
```sql
CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');
```

**Policy 3: Allow authenticated users to delete their uploads**
```sql
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);
```

## 6. Configure Authentication

1. Go to **Authentication** > **Settings**
2. Configure the following:

### Site URL
- **Site URL**: `http://localhost:3000` (for development)
- For production, use your actual domain

### Email Templates (Optional)
You can customize the email templates for:
- Confirm signup
- Magic link
- Change email address
- Reset password

### Auth Providers (Optional)
Enable additional providers if needed:
- Google
- GitHub
- Apple
- etc.

## 7. Test Your Setup

1. Start your development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000)
3. Try to sign up with a new account
4. Check if you can:
   - Create an account
   - Sign in
   - Add a new car
   - Add expenses
   - Upload documents
   - View analytics

## 8. Production Setup

When deploying to production:

1. **Update Site URL**: Change the Site URL in Supabase Auth settings to your production domain
2. **Environment Variables**: Add your environment variables to your hosting platform
3. **Database Backup**: Set up automated backups in Supabase
4. **Monitoring**: Enable database monitoring and alerts

## 9. Security Considerations

1. **Row Level Security**: Already enabled on all tables
2. **API Keys**: Never expose your service role key in client-side code
3. **CORS**: Supabase automatically handles CORS for your domain
4. **Rate Limiting**: Consider enabling rate limiting for production

## 10. Troubleshooting

### Common Issues:

**"Invalid API key"**
- Check that your environment variables are correct
- Restart your development server after changing .env.local

**"Permission denied"**
- Check that RLS policies are properly set up
- Verify user authentication status

**"Storage bucket not found"**
- Ensure the `documents` bucket is created
- Check bucket name spelling

**"Database connection failed"**
- Verify your project URL is correct
- Check if your project is paused (free tier limitation)

### Getting Help

1. Check the [Supabase Documentation](https://supabase.com/docs)
2. Visit the [Supabase Community](https://github.com/supabase/supabase/discussions)
3. Check the browser console for detailed error messages

## 11. Optional: Sample Data

To test the application with sample data, you can run this SQL in the SQL Editor:

```sql
-- Insert sample client
INSERT INTO clients (name, email, phone) VALUES 
('John Doe', 'john@example.com', '+971501234567');

-- Insert sample car
INSERT INTO cars (vin, make, model, year, purchase_price, purchase_currency, purchase_date, status) VALUES 
('1HGBH41JXMN109186', 'Toyota', 'Camry', 2023, 75000, 'AED', '2024-01-15', 'for_sale');

-- Insert sample expenses
INSERT INTO expenses (car_id, category, description, amount, currency, expense_date) 
SELECT id, 'transport', 'Shipping from Japan', 5000, 'AED', '2024-01-20'
FROM cars WHERE vin = '1HGBH41JXMN109186';
```

Your Car CRM system is now ready to use! 🚗✨
