const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createDemoUser() {
  try {
    console.log('Setting up demo user...')

    // First, try to get the user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const existingUser = users.users.find(user => user.email === 'aydmaxx@gmail.com')

    if (existingUser) {
      console.log('User already exists, updating password...')

      // Update existing user
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: 'Demo1234',
          email_confirm: true,
          user_metadata: {
            name: 'Demo User',
            role: 'admin'
          }
        }
      )

      if (error) {
        console.error('Error updating user:', error)
        return
      }

      console.log('Demo user updated successfully!')
    } else {
      console.log('Creating new demo user...')

      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: 'aydmaxx@gmail.com',
        password: 'Demo1234',
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          name: 'Demo User',
          role: 'admin'
        }
      })

      if (error) {
        console.error('Error creating user:', error)
        return
      }

      console.log('Demo user created successfully!')
    }

    console.log('Email: aydmaxx@gmail.com')
    console.log('Password: Demo1234')
    console.log('Ready to use Demo Login button!')

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

createDemoUser()
