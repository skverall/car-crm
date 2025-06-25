# Demo Access Instructions

## Quick Demo Login

The Car CRM System now includes a **Demo Login** feature for instant access without registration.

### How to Use Demo Login

1. **Visit the application** (deployed on Vercel or running locally)
2. **Look for the "🚗 Demo Login (Quick Access)" button** on the login page
3. **Click the button** - it will automatically log you in with demo credentials

### Demo Credentials

- **Email:** `aydmaxx@gmail.com`
- **Password:** `Demo1234`

### Features Available in Demo Mode

- Full access to all CRM features
- Vehicle inventory management
- Customer management
- Financial tracking and analytics
- Document management
- All dashboard functionality

### Manual Login (Alternative)

If you prefer to enter credentials manually:

1. Enter email: `aydmaxx@gmail.com`
2. Enter password: `Demo1234`
3. Click "Sign in"

### For Developers

#### Setting Up Demo User

If you need to recreate the demo user or set it up in a new Supabase instance:

```bash
# Run the demo user setup script
node scripts/create-demo-user.js
```

#### Environment Requirements

Make sure your `.env.local` file contains:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Benefits of Demo Login

- ✅ **No email verification required**
- ✅ **Instant access to the system**
- ✅ **Bypasses registration flow**
- ✅ **Perfect for testing and demonstrations**
- ✅ **No email sending limits**

### Deployment Notes

This demo user is configured to work on:
- Local development environment
- Vercel deployment
- Any environment using the same Supabase instance

The demo login button only appears on the "Sign In" tab, not during registration.
