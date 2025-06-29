'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  Car as CarIcon,
  BarChart3,
  DollarSign,
  Users,
  Home,
  LogOut,
  Menu,
  X,
  CreditCard,
  Package,
  Ship,
  Banknote,
  TrendingUp
} from 'lucide-react'
import { UserProfile } from '@/lib/types/database'

interface LayoutProps {
  children: React.ReactNode
  currentPage: 'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices'
  onPageChange: (page: 'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices') => void
  userProfile?: UserProfile | null
}

export default function Layout({ children, currentPage, onPageChange, userProfile }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const getNavigation = () => {
    const baseNavigation = [
      {
        id: 'dashboard',
        name: userProfile?.role === 'exporter' ? 'Export Dashboard' : 'Dashboard',
        icon: userProfile?.role === 'exporter' ? Ship : Home
      },
      {
        id: 'inventory',
        name: userProfile?.role === 'exporter' ? 'Export Inventory' : 'Inventory',
        icon: userProfile?.role === 'exporter' ? Package : CarIcon
      },
      { id: 'finance', name: 'Finance', icon: DollarSign },
      { id: 'cash', name: 'Cash & Bank', icon: Banknote },
      { id: 'debts', name: 'Debts', icon: CreditCard },
      { id: 'customers', name: 'Customers', icon: Users },
      { id: 'market-prices', name: '📊 Market Prices', icon: TrendingUp },
    ]
    return baseNavigation
  }

  const navigation = getNavigation()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex flex-col">
            <button
              onClick={() => onPageChange('dashboard')}
              className="flex items-center cursor-pointer"
            >
              <CarIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">DM Motion CRM</h1>
            </button>
            {userProfile && (
              <div className="flex items-center mt-1 ml-11">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  userProfile.role === 'exporter'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userProfile.role === 'exporter' ? '📦 Exporter' : '🚗 Importer'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 sm:mt-8">
          <div className="px-3 sm:px-4 space-y-1 sm:space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onPageChange(item.id as any)
                    setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center px-3 sm:px-4 py-4 sm:py-3 text-sm sm:text-sm font-medium rounded-lg transition-colors touch-manipulation ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
                  }`}
                >
                  <Icon className="h-6 w-6 sm:h-5 sm:w-5 mr-3" />
                  {item.name}
                </button>
              )
            })}
          </div>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 px-3 sm:px-4">
            {/* User Info */}
            {currentUser && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(userProfile?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userProfile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 sm:px-4 py-4 sm:py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 rounded-lg transition-colors touch-manipulation"
            >
              <LogOut className="h-6 w-6 sm:h-5 sm:w-5 mr-3" />
              Sign Out
            </button>

            {/* Signature */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-400 font-light italic tracking-wide">
                  by AydMaxx
                </p>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 lg:ml-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 -ml-2 touch-manipulation"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center">
              <button
                onClick={() => onPageChange('dashboard')}
                className="flex items-center cursor-pointer touch-manipulation mr-3"
              >
                <CarIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h1 className="text-base sm:text-lg font-bold text-gray-900">DM Motion CRM</h1>
              </button>
              {currentUser && userProfile && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  userProfile.role === 'exporter'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userProfile.role === 'exporter' ? '📦' : '🚗'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {currentUser && (
                <div className="flex items-center">
                  <div className="h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {(userProfile?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 touch-manipulation"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
