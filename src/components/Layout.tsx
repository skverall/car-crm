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
  TrendingUp,
  Shield
} from 'lucide-react'
import { UserProfile } from '@/lib/types/database'

interface LayoutProps {
  children: React.ReactNode
  currentPage: 'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices' | 'admin'
  onPageChange: (page: 'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices' | 'admin') => void
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

    // Add admin panel for admin users
    if (userProfile?.role === 'admin') {
      baseNavigation.push({
        id: 'admin',
        name: '👑 Admin Panel',
        icon: Shield
      })
    }

    return baseNavigation
  }

  const navigation = getNavigation()

  return (
    <div className="min-h-screen gradient-bg flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 modern-sidebar transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-white border-opacity-20">
          <div className="flex flex-col min-w-0 flex-1">
            <button
              onClick={() => onPageChange('dashboard')}
              className="flex items-center cursor-pointer touch-manipulation"
            >
              <CarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">DM Motion CRM</h1>
            </button>
            {userProfile && (
              <div className="flex items-center mt-1 ml-8 sm:ml-11">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  userProfile.role === 'exporter'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {userProfile.role === 'exporter' ? '📦 Exporter' : '🚗 Importer'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-white hover:bg-opacity-50 touch-manipulation flex-shrink-0"
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
                  className={`w-full flex items-center px-3 sm:px-4 py-4 sm:py-3 text-sm sm:text-sm font-medium rounded-xl transition-all duration-200 touch-manipulation ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-white hover:bg-opacity-60 hover:text-gray-900 active:bg-white active:bg-opacity-80'
                  }`}
                >
                  <Icon className="h-6 w-6 sm:h-5 sm:w-5 mr-3" />
                  {item.name}
                </button>
              )
            })}
          </div>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white border-opacity-20 px-3 sm:px-4">
            {/* User Info */}
            {currentUser && (
              <div className="mb-4 p-3 bg-white bg-opacity-30 rounded-xl backdrop-blur-sm">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(userProfile?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {userProfile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 sm:px-4 py-4 sm:py-3 text-sm font-medium text-gray-700 hover:bg-white hover:bg-opacity-50 hover:text-gray-900 active:bg-white active:bg-opacity-70 rounded-xl transition-all duration-200 touch-manipulation"
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
        <div className="lg:hidden modern-card border-b border-white border-opacity-20 mx-2 sm:mx-4 mt-2 sm:mt-4 mb-2">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-600 hover:text-gray-800 active:text-gray-900 p-2 -ml-2 touch-manipulation rounded-lg hover:bg-white hover:bg-opacity-50 flex-shrink-0"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center min-w-0 flex-1 justify-center">
              <button
                onClick={() => onPageChange('dashboard')}
                className="flex items-center cursor-pointer touch-manipulation"
              >
                <CarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600 mr-1 sm:mr-2 flex-shrink-0" />
                <h1 className="text-sm sm:text-base font-bold text-gray-800 truncate">DM Motion CRM</h1>
              </button>
              {currentUser && userProfile && (
                <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                  userProfile.role === 'exporter'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userProfile.role === 'exporter' ? '📦' : '🚗'}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {currentUser && (
                <div className="flex items-center">
                  <div className="h-6 w-6 sm:h-7 sm:w-7 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {(userProfile?.full_name || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="text-gray-400 hover:text-gray-600 active:text-gray-800 p-2 touch-manipulation rounded-lg hover:bg-white hover:bg-opacity-50"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-2 sm:p-4 lg:p-6">
          <div className="modern-card min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
