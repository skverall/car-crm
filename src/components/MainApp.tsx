'use client'

import { useState } from 'react'
import Layout from './Layout'
import Dashboard from './Dashboard'
import ExporterDashboard from './ExporterDashboard'
import InventoryPage from './InventoryPage'
import FinancePage from './FinancePage'
import DebtsPage from './DebtsPage'
import CustomersPage from './CustomersPage'
import DebugUserInfo from './DebugUserInfo'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'inventory' | 'finance' | 'customers' | 'debts'>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const { profile, loading } = useUserProfile()

  const handlePageChange = (page: 'dashboard' | 'inventory' | 'finance' | 'customers' | 'debts') => {
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
      case 'customers':
        return <CustomersPage key={`customers-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'debts':
        return <DebtsPage key={`debts-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      default:
        if (profile?.role === 'exporter') {
          return <ExporterDashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} />
        }
        return <Dashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} onPageChange={handlePageChange} />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange} userProfile={profile}>
      {renderCurrentPage()}
      <DebugUserInfo />
    </Layout>
  )
}
