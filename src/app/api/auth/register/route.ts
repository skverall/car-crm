import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, role } = await request.json()

    console.log('Registration attempt:', { email, fullName, role })

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!fullName) {
      return NextResponse.json(
        { error: 'Full name is required' },
        { status: 400 }
      )
    }

    if (!role || !['importer', 'exporter'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user already exists
    try {
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email)

      if (existingUser?.user) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        )
      }
    } catch (error) {
      // User doesn't exist, continue with creation
      console.log('User does not exist, proceeding with creation')
    }

    // Create user with admin API (bypasses email confirmation)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        full_name: fullName,
        role: role,
      }
    })

    if (error) {
      console.error('Registration error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('User created successfully:', data.user?.id)

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: data.user,
        needsConfirmation: false // Admin API creates confirmed users
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
