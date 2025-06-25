'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Expense, ExpenseCategory } from '@/lib/types/database'
import { formatCurrency, convertCurrency, getAllCurrencies } from '@/lib/utils/currency'
import { getCategoryLabel, formatDate } from '@/lib/utils'
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
      // Fetch cars
      const { data: carsData, error: carsError } = await supabase
        .from('cars')
        .select('*')
        .order('created_at', { ascending: false })

      if (carsError) throw carsError
      setCars(carsData || [])

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select(`
          *,
          cars (vin, make, model, year)
        `)
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Finance Management</h1>
        <p className="text-gray-600">Track all expenses and financial operations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Car Expenses</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalCarExpenses, 'AED')}
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
                <Receipt className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">General Expenses</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalOtherExpenses, 'AED')}
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
                <DollarSign className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalCarExpenses + totalOtherExpenses, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
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
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Filters and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search expenses..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setShowAddExpenseModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {(activeTab === 'car-expenses' ? filteredCarExpenses : filteredOtherExpenses).map((expense) => (
            <li
              key={expense.id}
              className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => handleExpenseClick(expense.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {expense.car_id ? (
                      <CarIcon className="h-5 w-5 text-blue-400" />
                    ) : (
                      <Receipt className="h-5 w-5 text-green-400" />
                    )}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      {getCategoryLabel(expense.category)}
                    </p>
                    <p className="text-sm text-gray-500">{expense.description}</p>
                    {expense.cars && (
                      <p className="text-xs text-gray-400">
                        {expense.cars.year} {expense.cars.make} {expense.cars.model} - {expense.cars.vin}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDate(expense.expense_date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(expense.amount, expense.currency)}
                  </p>
                  {expense.currency !== 'AED' && (
                    <p className="text-xs text-gray-500">
                      ≈ {formatCurrency(convertCurrency(expense.amount, expense.currency, 'AED'), 'AED')}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        {(activeTab === 'car-expenses' ? filteredCarExpenses : filteredOtherExpenses).length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses found</h3>
            <p className="mt-1 text-sm text-gray-500">
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
