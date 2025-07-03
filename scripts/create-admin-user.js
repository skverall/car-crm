const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createAdminUser() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const adminEmail = 'admin@admin.com'
  const adminPassword = 'Admin123!'

  try {
    console.log('Creating admin user...')

    // Check if admin user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(user => user.email === adminEmail)

    if (existingUser) {
      console.log('Admin user already exists, updating...')

      // Update existing user
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: adminPassword,
          email_confirm: true,
          user_metadata: {
            full_name: 'System Administrator',
            role: 'admin'
          }
        }
      )

      if (error) {
        console.error('Error updating admin user:', error)
        return
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: existingUser.id,
          role: 'admin',
          full_name: 'System Administrator',
        })

      if (profileError) {
        console.error('Error updating admin profile:', profileError)
      } else {
        console.log('Admin user updated successfully!')
      }
    } else {
      console.log('Creating new admin user...')

      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: 'System Administrator',
          role: 'admin'
        }
      })

      if (error) {
        console.error('Error creating admin user:', error)
        return
      }

      console.log('Admin user created successfully!')

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            role: 'admin',
            full_name: 'System Administrator',
          })

        if (profileError) {
          console.error('Error creating admin profile:', profileError)
        } else {
          console.log('Admin profile created successfully!')
        }
      }
    }

    console.log('\n=== ADMIN USER CREDENTIALS ===')
    console.log(`Email: ${adminEmail}`)
    console.log(`Password: ${adminPassword}`)
    console.log('===============================\n')
    console.log('You can now log in with these credentials and access the Admin Panel.')
    console.log('Make sure to change the password after first login!')

  } catch (error) {
    console.error('Error:', error)
  }
}

createAdminUser()
