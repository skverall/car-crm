import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile } from '@/lib/types/database'

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setError('No authenticated user')
          return
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          // If profile doesn't exist, create one from user metadata
          if (error.code === 'PGRST116') {
            console.log('Creating new user profile...')
            const { data: newProfile, error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: user.id,
                role: (user.user_metadata?.role as 'importer' | 'exporter' | 'admin') || 'importer',
                full_name: user.user_metadata?.full_name || user.email || 'User',
              })
              .select()
              .single()

            if (insertError) {
              console.error('Error creating profile:', insertError)
              // If we can't create profile, create a default one in memory
              setProfile({
                id: user.id,
                role: 'importer',
                full_name: user.email || 'User',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
            } else {
              setProfile(newProfile)
            }
          } else {
            console.error('Profile fetch error:', error)
            // Create a default profile in memory
            setProfile({
              id: user.id,
              role: 'importer',
              full_name: user.email || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
          }
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  return { profile, loading, error }
}
