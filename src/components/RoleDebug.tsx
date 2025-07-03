'use client'

import { useUserProfile } from '@/hooks/useUserProfile'

export default function RoleDebug() {
  const { profile, loading, error } = useUserProfile()

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded-lg max-w-sm text-sm z-50">
      <h3 className="font-bold mb-2">Role Debug</h3>
      
      {loading && <div>Loading profile...</div>}
      
      {error && (
        <div className="text-red-600 mb-2">
          Error: {error}
        </div>
      )}
      
      {profile && (
        <div>
          <div><strong>Role:</strong> {profile.role}</div>
          <div><strong>Name:</strong> {profile.full_name}</div>
          <div><strong>ID:</strong> {profile.id}</div>
          <div><strong>Is Admin:</strong> {profile.role === 'admin' ? 'YES' : 'NO'}</div>
        </div>
      )}
      
      {!loading && !profile && (
        <div className="text-red-600">No profile found</div>
      )}
    </div>
  )
}
