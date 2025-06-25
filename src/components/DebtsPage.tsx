'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Debt, DebtSummary } from '@/lib/types/debt'
import { Car } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils'
import { 
  Plus, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  DollarSign
} from 'lucide-react'
import AddDebtModal from './AddDebtModal'
import DebtDetailModal from './DebtDetailModal'

interface DebtsPageProps {
  onDataUpdate?: () => void
}

export default function DebtsPage({ onDataUpdate }: DebtsPageProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const [showAddDebtModal, setShowAddDebtModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const handleDebtClick = (debtId: string) => {
    setSelectedDebtId(debtId)
    setShowDetailModal(true)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch debts
      const { data: debtsData, error: debtsError } = await supabase
        .from('debts')
        .select(`
          *,
          cars (
            id,
            vin,
            make,
            model,
            year
          )
        `)
        .order('created_at', { ascending: false })

      if (debtsError) throw debtsError

      // Fetch cars for dropdown
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, vin, make, model, year')
        .order('created_at', { ascending: false })

      if (carsError) throw carsError

      setDebts(debtsData || [])
      setCars(carsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSummary = (): DebtSummary => {
    const totalDebt = debts.reduce((sum, debt) => 
      sum + convertCurrency(debt.amount, debt.currency, 'AED'), 0)
    
    const paidDebt = debts
      .filter(debt => debt.status === 'paid')
      .reduce((sum, debt) => sum + convertCurrency(debt.amount, debt.currency, 'AED'), 0)
    
    const pendingDebt = debts
      .filter(debt => debt.status === 'pending')
      .reduce((sum, debt) => sum + convertCurrency(debt.amount, debt.currency, 'AED'), 0)
    
    const overdueDebt = debts
      .filter(debt => debt.status === 'overdue')
      .reduce((sum, debt) => sum + convertCurrency(debt.amount, debt.currency, 'AED'), 0)

    return {
      totalDebt,
      paidDebt,
      pendingDebt,
      overdueDebt,
      totalDebts: debts.length
    }
  }

  const filteredDebts = debts.filter(debt => {
    const matchesSearch = debt.creditor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (debt.cars && `${debt.cars.year} ${debt.cars.make} ${debt.cars.model}`.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const summary = calculateSummary()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Debt Management</h1>
          <p className="text-gray-600">Track and manage your business debts and payments</p>
        </div>
        <button
          onClick={() => setShowAddDebtModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Debt</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summary.totalDebt, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Paid Debt</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summary.paidDebt, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Debt</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summary.pendingDebt, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue Debt</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(summary.overdueDebt, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search debts..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Debts List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredDebts.map((debt) => (
            <li
              key={debt.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleDebtClick(debt.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {getStatusIcon(debt.status)}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{debt.creditor_name}</p>
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                        {debt.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{debt.description}</p>
                    {debt.cars && (
                      <p className="text-xs text-gray-400">
                        Vehicle: {debt.cars.year} {debt.cars.make} {debt.cars.model}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(debt.amount, debt.currency)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {debt.due_date ? formatDate(debt.due_date) : 'No due date'}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {filteredDebts.length === 0 && (
          <div className="text-center py-8">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No debts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first debt.'}
            </p>
          </div>
        )}
      </div>

      {/* Add Debt Modal */}
      <AddDebtModal
        isOpen={showAddDebtModal}
        onClose={() => setShowAddDebtModal(false)}
        onDebtAdded={fetchData}
      />

      {/* Debt Detail Modal */}
      <DebtDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedDebtId(null)
        }}
        debtId={selectedDebtId}
        onDebtUpdated={fetchData}
      />
    </div>
  )
}
