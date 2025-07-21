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
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  X
} from 'lucide-react'
import AddDebtModal from './AddDebtModal'
import DebtDetailModal from './DebtDetailModal'

interface DebtsPageProps {
  onDataUpdate?: () => void
}

type SortField = 'created_at' | 'due_date' | 'amount' | 'creditor_name'
type SortDirection = 'asc' | 'desc'

export default function DebtsPage({ onDataUpdate }: DebtsPageProps) {
  const [debts, setDebts] = useState<Debt[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AED' | 'USD' | 'EUR' | 'GBP'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'this_week' | 'this_month' | 'overdue'>('all')
  const [amountRange, setAmountRange] = useState({ min: '', max: '' })
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCurrencyFilter('all')
    setDateFilter('all')
    setAmountRange({ min: '', max: '' })
    setSortField('created_at')
    setSortDirection('desc')
  }

  const filteredAndSortedDebts = debts
    .filter(debt => {
      // Search filter
      const matchesSearch = debt.creditor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           debt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (debt.cars && `${debt.cars.year} ${debt.cars.make} ${debt.cars.model}`.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status filter
      const matchesStatus = statusFilter === 'all' || debt.status === statusFilter

      // Currency filter
      const matchesCurrency = currencyFilter === 'all' || debt.currency === currencyFilter

      // Date filter
      let matchesDate = true
      if (dateFilter !== 'all') {
        const now = new Date()
        const debtDate = new Date(debt.created_at)
        const dueDate = debt.due_date ? new Date(debt.due_date) : null

        switch (dateFilter) {
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = debtDate >= weekAgo
            break
          case 'this_month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            matchesDate = debtDate >= monthAgo
            break
          case 'overdue':
            matchesDate = dueDate ? dueDate < now && debt.status !== 'paid' : false
            break
        }
      }

      // Amount range filter
      let matchesAmount = true
      if (amountRange.min || amountRange.max) {
        const amount = convertCurrency(debt.amount, debt.currency, 'AED')
        if (amountRange.min && amount < parseFloat(amountRange.min)) matchesAmount = false
        if (amountRange.max && amount > parseFloat(amountRange.max)) matchesAmount = false
      }

      return matchesSearch && matchesStatus && matchesCurrency && matchesDate && matchesAmount
    })
    .sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortField) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0
          break
        case 'amount':
          aValue = convertCurrency(a.amount, a.currency, 'AED')
          bValue = convertCurrency(b.amount, b.currency, 'AED')
          break
        case 'creditor_name':
          aValue = a.creditor_name.toLowerCase()
          bValue = b.creditor_name.toLowerCase()
          break
        default:
          aValue = a.created_at
          bValue = b.created_at
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
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

      {/* Filters and Sorting */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4">
          {/* Main Filter Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4 mb-4">
            {/* Search */}
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by creditor, description, or vehicle..."
                  className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none bg-white min-w-[140px]"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleSort('created_at')}
                  className={`px-3 py-2 rounded-lg border transition-colors flex items-center space-x-1 ${
                    sortField === 'created_at'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Date</span>
                  {sortField === 'created_at' && (
                    sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </button>

                <button
                  onClick={() => handleSort('amount')}
                  className={`px-3 py-2 rounded-lg border transition-colors flex items-center space-x-1 ${
                    sortField === 'amount'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Amount</span>
                  {sortField === 'amount' && (
                    sortDirection === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                  )}
                </button>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 rounded-lg border transition-colors flex items-center space-x-1 ${
                  showAdvancedFilters
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-sm">Filters</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Currency Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={currencyFilter}
                    onChange={(e) => setCurrencyFilter(e.target.value as any)}
                  >
                    <option value="all">All Currencies</option>
                    <option value="AED">AED</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                  >
                    <option value="all">All Time</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="overdue">Overdue Only</option>
                  </select>
                </div>

                {/* Amount Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount (AED)</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={amountRange.min}
                    onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount (AED)</label>
                  <input
                    type="number"
                    placeholder="No limit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    value={amountRange.max}
                    onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-1"
                >
                  <X className="h-4 w-4" />
                  <span>Clear All Filters</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {(searchTerm || statusFilter !== 'all' || currencyFilter !== 'all' || dateFilter !== 'all' || amountRange.min || amountRange.max) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Showing {filteredAndSortedDebts.length} of {debts.length} debts</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Debts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAndSortedDebts.map((debt) => (
          <div
            key={debt.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer"
            onClick={() => handleDebtClick(debt.id)}
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    debt.status === 'paid'
                      ? 'bg-green-100'
                      : debt.status === 'overdue'
                        ? 'bg-red-100'
                        : 'bg-amber-100'
                  }`}>
                    {debt.status === 'paid' ? (
                      <CheckCircle className={`h-5 w-5 text-green-600`} />
                    ) : debt.status === 'overdue' ? (
                      <AlertTriangle className={`h-5 w-5 text-red-600`} />
                    ) : (
                      <Clock className={`h-5 w-5 text-amber-600`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-base truncate">{debt.creditor_name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium mt-1 ${
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
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(debt.amount, debt.currency)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {debt.currency !== 'AED' && `≈ ${formatCurrency(convertCurrency(debt.amount, debt.currency, 'AED'), 'AED')}`}
                  </p>
                </div>
              </div>

              {/* Description */}
              {debt.description && (
                <div className="mb-3">
                  <p className="text-gray-600 text-sm leading-relaxed line-clamp-2">{debt.description}</p>
                </div>
              )}

              {/* Compact Details */}
              <div className="space-y-2">
                {/* Vehicle Info - Compact */}
                {debt.cars && (
                  <div className="flex items-center text-xs text-gray-500">
                    <CreditCard className="h-3 w-3 mr-1.5" />
                    <span className="truncate">
                      {debt.cars.year} {debt.cars.make} {debt.cars.model}
                    </span>
                  </div>
                )}

                {/* Due Date - Compact */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-gray-500">
                    <Calendar className="h-3 w-3 mr-1.5" />
                    <span>Due: </span>
                    <span className={`ml-1 ${
                      debt.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-700'
                    }`}>
                      {debt.due_date ? formatDate(debt.due_date) : 'No due date'}
                    </span>
                  </div>

                  <div className="flex items-center text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{debt.created_at ? formatRelativeTime(debt.created_at) : 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Priority Indicator for Overdue */}
              {debt.status === 'overdue' && (
                <div className="mt-3 pt-2 border-t border-red-100">
                  <div className="flex items-center text-xs text-red-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    <span className="font-medium">
                      {debt.due_date &&
                        `${Math.ceil((new Date().getTime() - new Date(debt.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue`
                      }
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {filteredAndSortedDebts.length === 0 && (
        <div className="col-span-full">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No debts found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchTerm || statusFilter !== 'all' || currencyFilter !== 'all' || dateFilter !== 'all' || amountRange.min || amountRange.max
                ? 'Try adjusting your search or filter criteria to find the debts you\'re looking for.'
                : 'Get started by adding your first debt to track your business obligations.'}
            </p>
            {!searchTerm && statusFilter === 'all' && currencyFilter === 'all' && dateFilter === 'all' && !amountRange.min && !amountRange.max && (
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
