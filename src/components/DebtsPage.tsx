'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Debt, DebtSummary } from '@/lib/types/debt'
import { Car } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import {
  Plus,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  FileText,
  Target,
  BarChart3
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
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setDebts([])
        setCars([])
        return
      }

      // Fetch debts (only for current user)
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
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (debtsError) throw debtsError

      // Fetch cars for dropdown (only current user's cars)
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('id, vin, make, model, year')
        .eq('user_id', user.id)
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Debt Management</h1>
          <p className="text-gray-600 text-lg">Track and manage your business debts and payments</p>
        </div>
        <button
          onClick={() => setShowAddDebtModal(true)}
          className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Debt
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Debt Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-slate-500 rounded-xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
              Total
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-slate-600 font-medium">Total Debt</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.totalDebt, 'AED')}
            </p>
            <p className="text-xs text-slate-500">{debts.length} debt{debts.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Paid Debt Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-200 px-2 py-1 rounded-full">
              Paid
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-green-600 font-medium">Paid Debt</p>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(summary.paidDebt, 'AED')}
            </p>
            <p className="text-xs text-green-500">
              {debts.filter(d => d.status === 'paid').length} completed
            </p>
          </div>
        </div>

        {/* Pending Debt Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-200 px-2 py-1 rounded-full">
              Pending
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-amber-600 font-medium">Pending Debt</p>
            <p className="text-2xl font-bold text-amber-900">
              {formatCurrency(summary.pendingDebt, 'AED')}
            </p>
            <p className="text-xs text-amber-500">
              {debts.filter(d => d.status === 'pending').length} awaiting payment
            </p>
          </div>
        </div>

        {/* Overdue Debt Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-200 px-2 py-1 rounded-full">
              Overdue
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-red-600 font-medium">Overdue Debt</p>
            <p className="text-2xl font-bold text-red-900">
              {formatCurrency(summary.overdueDebt, 'AED')}
            </p>
            <p className="text-xs text-red-500">
              {debts.filter(d => d.status === 'overdue').length} past due
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by creditor name or description..."
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-56">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white"
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
      </div>

      {/* Debts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDebts.map((debt) => (
          <div
            key={debt.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => handleDebtClick(debt.id)}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    debt.status === 'paid'
                      ? 'bg-green-100'
                      : debt.status === 'overdue'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                  }`}>
                    {debt.status === 'paid' ? (
                      <CheckCircle className={`h-6 w-6 text-green-600`} />
                    ) : debt.status === 'overdue' ? (
                      <AlertTriangle className={`h-6 w-6 text-red-600`} />
                    ) : (
                      <Clock className={`h-6 w-6 text-amber-600`} />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-semibold text-gray-900 text-lg">{debt.creditor_name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      debt.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : debt.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(debt.amount, debt.currency)}
                  </p>
                </div>
              </div>

              {/* Description */}
              {debt.description && (
                <div className="mb-4">
                  <p className="text-gray-600 text-sm leading-relaxed">{debt.description}</p>
                </div>
              )}

              {/* Details */}
              <div className="space-y-3">
                {/* Vehicle Info */}
                {debt.cars && (
                  <div className="flex items-center text-sm">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-gray-500">Vehicle</p>
                      <p className="font-medium text-gray-900">
                        {debt.cars.year} {debt.cars.make} {debt.cars.model}
                      </p>
                    </div>
                  </div>
                )}

                {/* Due Date */}
                <div className="flex items-center text-sm">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">Due Date</p>
                    <p className={`font-medium ${
                      debt.status === 'overdue' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {debt.due_date ? formatDate(debt.due_date) : 'No due date'}
                    </p>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-center text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-gray-500">Added</p>
                    <p className="font-medium text-gray-900">
                      {debt.created_at ? formatRelativeTime(debt.created_at) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredDebts.length === 0 && (
        <div className="col-span-full">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No debts found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria to find the debts you\'re looking for.'
                : 'Get started by adding your first debt to track your business obligations.'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setShowAddDebtModal(true)}
                className="btn-primary px-6 py-3 rounded-lg font-medium"
              >
                <Plus className="h-4 w-4 mr-2 inline" />
                Add Your First Debt
              </button>
            )}
          </div>
        </div>
      )}

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
