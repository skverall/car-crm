'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Expense, ExpenseCategory } from '@/lib/types/database'
import { formatCurrency, convertCurrency, getAllCurrencies } from '@/lib/utils/currency'
import { getCategoryLabel, formatDate, formatRelativeTime } from '@/lib/utils'
import {
  Plus,
  DollarSign,
  Car as CarIcon,
  Receipt,
  Search,
  Filter,
  BarChart3
} from 'lucide-react'
import AddExpenseModalAdvanced from './AddExpenseModalAdvanced'
import AnalyticsModal from './AnalyticsModal'
import ExpenseDetailModal from './ExpenseDetailModal'

interface FinancePageProps {
  onDataUpdate?: () => void
}

export default function FinancePage({ onDataUpdate }: FinancePageProps) {
  const [cars, setCars] = useState<Car[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'car-expenses' | 'other-expenses'>('car-expenses')
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const handleExpenseClick = (expenseId: string) => {
    setSelectedExpenseId(expenseId)
    setShowDetailModal(true)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setCars([])
        setExpenses([])
        return
      }

      // Fetch cars (only for current user)
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (carsError) throw carsError
      setCars(carsData || [])

      // Fetch expenses (only for current user)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          cars (vin, make, model, year)
        `)
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })

      if (expensesError) throw expensesError
      setExpenses(expensesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const carExpenses = expenses.filter(expense => expense.car_id)
  const otherExpenses = expenses.filter(expense => !expense.car_id)

  const filteredCarExpenses = carExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.cars && `${expense.cars.make} ${expense.cars.model}`.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredOtherExpenses = otherExpenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const totalCarExpenses = carExpenses.reduce((sum, expense) => 
    sum + convertCurrency(expense.amount, expense.currency, 'AED'), 0)
  
  const totalOtherExpenses = otherExpenses.reduce((sum, expense) => 
    sum + convertCurrency(expense.amount, expense.currency, 'AED'), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="modern-card p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Finance Management</h1>
        <p className="text-gray-600 text-lg">Track all expenses and financial operations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                <CarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Car Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalCarExpenses, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">4 operations</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-pink-600 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">General Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalOtherExpenses, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">2 operations</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalCarExpenses + totalOtherExpenses, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">6 operations total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'car-expenses', name: 'Car Expenses', count: carExpenses.length },
            { id: 'other-expenses', name: 'General Expenses', count: otherExpenses.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="pl-12 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="purchase">Purchase</option>
            <option value="transport">Transport</option>
            <option value="customs">Customs</option>
            <option value="repair">Repair</option>
            <option value="maintenance">Maintenance</option>
            <option value="marketing">Marketing</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="modern-card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Expense History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {(activeTab === 'car-expenses' ? filteredCarExpenses : filteredOtherExpenses).map((expense) => (
            <div
              key={expense.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-all duration-200"
              onClick={() => handleExpenseClick(expense.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      expense.car_id
                        ? 'bg-blue-100'
                        : expense.category === 'repair'
                          ? 'bg-red-100'
                          : expense.category === 'transport'
                            ? 'bg-blue-100'
                            : expense.category === 'customs'
                              ? 'bg-blue-100'
                              : 'bg-green-100'
                    }`}>
                      <span className={`font-semibold text-sm ${
                        expense.car_id
                          ? 'text-blue-600'
                          : expense.category === 'repair'
                            ? 'text-red-600'
                            : expense.category === 'transport'
                              ? 'text-blue-600'
                              : expense.category === 'customs'
                                ? 'text-blue-600'
                                : 'text-green-600'
                      }`}>
                        {expense.category === 'repair' ? 'RM' :
                         expense.category === 'transport' ? 'TR' :
                         expense.category === 'customs' ? 'CS' :
                         expense.category.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-800">
                      {getCategoryLabel(expense.category)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {expense.cars ?
                        `${expense.cars.year} ${expense.cars.make} ${expense.cars.model} • ${formatDate(expense.expense_date)}` :
                        `${expense.description} • ${formatDate(expense.expense_date)}`
                      }
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  {expense.currency !== 'AED' && (
                    <p className="text-xs text-gray-500">
                      ≈ {formatCurrency(convertCurrency(expense.amount, expense.currency, 'AED'), 'AED')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {(activeTab === 'car-expenses' ? filteredCarExpenses : filteredOtherExpenses).length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No expenses found</h3>
            <p className="text-gray-600">
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first expense.'}
            </p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModalAdvanced
        isOpen={showAddExpenseModal}
        onClose={() => setShowAddExpenseModal(false)}
        onExpenseAdded={fetchData}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />

      {/* Expense Detail Modal */}
      <ExpenseDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedExpenseId(null)
        }}
        expenseId={selectedExpenseId}
        onExpenseUpdated={fetchData}
      />
    </div>
  )
}
