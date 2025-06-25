'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugUserInfo() {
  const [userInfo, setUserInfo] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        
        setUserInfo(user)

        if (user) {
          // Try to get user profile
          const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile error:', profileError)
          } else {
            setProfile(profileData)
          }
        }
      } catch (err) {
        console.error('Debug error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchDebugInfo()
  }, [])

  if (process.env.NODE_ENV === 'production') {
    return null // Don't show in production
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg max-w-md text-xs z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      
      {error && (
        <div className="text-red-400 mb-2">
          Error: {error}
        </div>
      )}
      
      <div className="mb-2">
        <strong>User:</strong> {userInfo ? 'Logged in' : 'Not logged in'}
      </div>
      
      {userInfo && (
        <div className="mb-2">
          <strong>User ID:</strong> {userInfo.id}
          <br />
          <strong>Email:</strong> {userInfo.email}
        </div>
      )}
      
      <div className="mb-2">
        <strong>Profile:</strong> {profile ? 'Found' : 'Not found'}
      </div>
      
      {profile && (
        <div>
          <strong>Role:</strong> {profile.role}
          <br />
          <strong>Name:</strong> {profile.full_name}
        </div>
      )}
    </div>
  )
}
