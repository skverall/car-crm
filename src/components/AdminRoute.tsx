'use client'

import { ReactNode } from 'react'
import { useAdminCheck } from '@/hooks/useAdminCheck'
import { Shield, AlertTriangle } from 'lucide-react'

interface AdminRouteProps {
  children: ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAdmin, loading } = useAdminCheck()

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto mt-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Access Denied
            </h2>
            <p className="text-red-700 mb-4">
              You need administrator privileges to access this page.
            </p>
            <div className="flex items-center justify-center text-sm text-red-600">
              <Shield className="h-4 w-4 mr-1" />
              Administrator access required
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
