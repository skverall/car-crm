'use client'

import { useState, useEffect } from 'react'
import Layout from './Layout'
import Dashboard from './Dashboard'
import ExporterDashboard from './ExporterDashboard'
import InventoryPage from './InventoryPage'
import FinancePage from './FinancePage'
import CashManagementPage from './CashManagementPage'
import DebtsPage from './DebtsPage'
import CustomersPage from './CustomersPage'
import MarketPricesPage from './MarketPricesPage'
import DebugUserInfo from './DebugUserInfo'
import RoleDebug from './RoleDebug'
import AdminPanel from './AdminPanel'
import AdminRoute from './AdminRoute'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useMobileTestHelper } from './MobileTestHelper'

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices' | 'admin'>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const { profile, loading } = useUserProfile()
  const { TestHelper } = useMobileTestHelper()

  // Prevent browser back button from leaving the app
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Prevent default browser back behavior
      event.preventDefault()
      // Stay on the current page or go to dashboard
      window.history.pushState(null, '', window.location.href)
    }

    // Push initial state
    window.history.pushState(null, '', window.location.href)

    // Add event listener
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handlePageChange = (page: 'dashboard' | 'inventory' | 'finance' | 'cash' | 'customers' | 'debts' | 'market-prices' | 'admin') => {
    setCurrentPage(page)
  }

  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        // Show different dashboard based on user role
        if (profile?.role === 'exporter') {
          return <ExporterDashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} />
        }
        return <Dashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} onPageChange={handlePageChange} />
      case 'inventory':
        return <InventoryPage key={`inventory-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'finance':
        return <FinancePage key={`finance-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'cash':
        return <CashManagementPage key={`cash-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'customers':
        return <CustomersPage key={`customers-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'debts':
        return <DebtsPage key={`debts-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'market-prices':
        return <MarketPricesPage key={`market-prices-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'admin':
        return (
          <AdminRoute>
            <AdminPanel key={`admin-${refreshKey}`} />
          </AdminRoute>
        )
      default:
        if (profile?.role === 'exporter') {
          return <ExporterDashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} />
        }
        return <Dashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} onPageChange={handlePageChange} />
    }
  }

  if (loading) {
    return (
      <div className="gradient-bg flex items-center justify-center min-h-screen">
        <div className="modern-card p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your CRM...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Layout currentPage={currentPage} onPageChange={handlePageChange} userProfile={profile}>
        {renderCurrentPage()}
      </Layout>
      {/* Mobile Test Helper - only in development */}
      {process.env.NODE_ENV === 'development' && <TestHelper />}
    </>
  )
}
