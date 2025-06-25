'use client'

import { useState } from 'react'
import Layout from './Layout'
import Dashboard from './Dashboard'
import InventoryPage from './InventoryPage'
import FinancePage from './FinancePage'
import DebtsPage from './DebtsPage'
import CustomersPage from './CustomersPage'

export default function MainApp() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'inventory' | 'finance' | 'customers' | 'debts'>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)

  const handlePageChange = (page: 'dashboard' | 'inventory' | 'finance' | 'customers' | 'debts') => {
    setCurrentPage(page)
  }

  const handleDataUpdate = () => {
    setRefreshKey(prev => prev + 1)
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'inventory':
        return <InventoryPage key={`inventory-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'finance':
        return <FinancePage key={`finance-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'customers':
        return <CustomersPage key={`customers-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      case 'debts':
        return <DebtsPage key={`debts-${refreshKey}`} onDataUpdate={handleDataUpdate} />
      default:
        return <Dashboard key={`dashboard-${refreshKey}`} onDataUpdate={handleDataUpdate} />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderCurrentPage()}
    </Layout>
  )
}
