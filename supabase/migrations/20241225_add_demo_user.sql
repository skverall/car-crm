-- Add demo user for testing purposes
-- This user will bypass email confirmation

-- Insert demo user into auth.users table
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'aydmaxx@gmail.com',
  crypt('Demo1234', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated'
) ON CONFLICT (email) DO UPDATE SET
  encrypted_password = crypt('Demo1234', gen_salt('bf')),
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- Insert corresponding identity record
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) SELECT 
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users u 
WHERE u.email = 'aydmaxx@gmail.com'
ON CONFLICT (provider, user_id) DO NOTHING;
