import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'

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

    // Use regular client for now - we'll handle email confirmation differently
    const supabase = createClient()

    // Try to sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        }
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
        message: 'User created successfully. Please check your email for confirmation.',
        user: data.user,
        needsConfirmation: !data.user?.email_confirmed_at
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
