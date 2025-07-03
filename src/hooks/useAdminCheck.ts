import { useState, useEffect } from 'react'
import { useUserProfile } from './useUserProfile'

export function useAdminCheck() {
  const { profile, loading } = useUserProfile()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    if (!loading) {
      setIsAdmin(profile?.role === 'admin')
      setCheckingAdmin(false)
    }
  }, [profile, loading])

  return {
    isAdmin,
    loading: loading || checkingAdmin,
    profile
  }
}
