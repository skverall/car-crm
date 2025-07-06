'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Budget, BudgetCategory, BudgetPeriod, BudgetStatus, ExpenseCategory, CurrencyType } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils'
import {
  X,
  Target,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  PieChart
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell
} from 'recharts'

interface BudgetManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

interface BudgetWithCategories extends Budget {
  categories: BudgetCategory[]
  totalAllocated: number
  totalSpent: number
  totalRemaining: number
  overallVariance: number
}

export default function BudgetManagementModal({ isOpen, onClose }: BudgetManagementModalProps) {
  const [loading, setLoading] = useState(false)
  const [budgets, setBudgets] = useState<BudgetWithCategories[]>([])
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithCategories | null>(null)
  const [showCreateBudget, setShowCreateBudget] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'create'>('overview')
  const [newBudget, setNewBudget] = useState({
    name: '',
    description: '',
    period: 'monthly' as BudgetPeriod,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  })
  const [budgetCategories, setBudgetCategories] = useState<Array<{
    category: ExpenseCategory
    allocated_amount: number
    currency: CurrencyType
  }>>([])
  const supabase = createClient()

  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch budgets
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (budgetsError) throw budgetsError

      // Fetch budget categories for each budget
      const budgetsWithCategories: BudgetWithCategories[] = []
      
      for (const budget of budgetsData || []) {
        const { data: categoriesData } = await supabase
          .from('budget_categories')
          .select('*')
          .eq('budget_id', budget.id)

        // Calculate spent amounts for each category
        const categoriesWithSpent = await Promise.all(
          (categoriesData || []).map(async (category) => {
            const { data: expenses } = await supabase
              .from('expenses')
              .select('amount, currency')
              .eq('user_id', user.id)
              .eq('category', category.category)
              .gte('expense_date', budget.start_date)
              .lte('expense_date', budget.end_date)

            const spentAmount = expenses?.reduce((sum, expense) => {
              return sum + convertCurrency(expense.amount, expense.currency, category.currency)
            }, 0) || 0

            return {
              ...category,
              spent_amount: spentAmount,
              remaining_amount: category.allocated_amount - spentAmount,
              variance_percentage: category.allocated_amount > 0 
                ? ((spentAmount - category.allocated_amount) / category.allocated_amount) * 100 
                : 0
            }
          })
        )

        const totalAllocated = categoriesWithSpent.reduce((sum, cat) => 
          sum + convertCurrency(cat.allocated_amount, cat.currency, 'AED'), 0)
        const totalSpent = categoriesWithSpent.reduce((sum, cat) => 
          sum + convertCurrency(cat.spent_amount || 0, cat.currency, 'AED'), 0)
        const totalRemaining = totalAllocated - totalSpent
        const overallVariance = totalAllocated > 0 ? ((totalSpent - totalAllocated) / totalAllocated) * 100 : 0

        budgetsWithCategories.push({
          ...budget,
          categories: categoriesWithSpent,
          totalAllocated,
          totalSpent,
          totalRemaining,
          overallVariance
        })
      }

      setBudgets(budgetsWithCategories)
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen) {
      fetchBudgets()
    }
  }, [isOpen, fetchBudgets])

  const createBudget = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Create budget
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .insert([{
          user_id: user.id,
          name: newBudget.name,
          description: newBudget.description,
          period: newBudget.period,
          start_date: newBudget.start_date,
          end_date: newBudget.end_date,
          status: 'active' as BudgetStatus
        }])
        .select()
        .single()

      if (budgetError) throw budgetError

      // Create budget categories
      if (budgetCategories.length > 0) {
        const { error: categoriesError } = await supabase
          .from('budget_categories')
          .insert(
            budgetCategories.map(cat => ({
              budget_id: budgetData.id,
              category: cat.category,
              allocated_amount: cat.allocated_amount,
              currency: cat.currency
            }))
          )

        if (categoriesError) throw categoriesError
      }

      // Reset form
      setNewBudget({
        name: '',
        description: '',
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      })
      setBudgetCategories([])
      setActiveTab('overview')
      fetchBudgets()
    } catch (error) {
      console.error('Error creating budget:', error)
      alert('Error creating budget. Please try again.')
    }
  }

  const addBudgetCategory = () => {
    setBudgetCategories([...budgetCategories, {
      category: 'other',
      allocated_amount: 0,
      currency: 'AED'
    }])
  }

  const updateBudgetCategory = (index: number, field: string, value: any) => {
    const updated = [...budgetCategories]
    updated[index] = { ...updated[index], [field]: value }
    setBudgetCategories(updated)
  }

  const removeBudgetCategory = (index: number) => {
    setBudgetCategories(budgetCategories.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  const categoryColors = {
    purchase: '#3B82F6',
    transport: '#10B981',
    customs: '#F59E0B',
    repair: '#EF4444',
    maintenance: '#8B5CF6',
    marketing: '#06B6D4',
    office: '#84CC16',
    other: '#6B7280'
  }

  return (
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-7xl mb-10">
        <div className="modal-content p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">Budget Management</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Budget Overview', icon: PieChart },
                { id: 'create', name: 'Create Budget', icon: Plus }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-all duration-200 flex items-center`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Budget Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {budgets.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Target className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">No budgets found</h3>
                      <p className="text-gray-600 mb-4">Create your first budget to start tracking expenses</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="btn-primary px-6 py-3 rounded-xl flex items-center mx-auto"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Create Budget
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {budgets.map((budget) => (
                        <div key={budget.id} className="modern-card p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-800">{budget.name}</h4>
                              <p className="text-sm text-gray-600">{budget.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(budget.start_date)} - {formatDate(budget.end_date)}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              budget.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : budget.status === 'completed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}>
                              {budget.status}
                            </span>
                          </div>

                          <div className="space-y-4">
                            {/* Budget Summary */}
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center">
                                <p className="text-sm text-gray-600">Allocated</p>
                                <p className="text-lg font-bold text-blue-600">
                                  {formatCurrency(budget.totalAllocated, 'AED')}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-600">Spent</p>
                                <p className="text-lg font-bold text-red-600">
                                  {formatCurrency(budget.totalSpent, 'AED')}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-600">Remaining</p>
                                <p className={`text-lg font-bold ${
                                  budget.totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(budget.totalRemaining, 'AED')}
                                </p>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  budget.totalSpent > budget.totalAllocated
                                    ? 'bg-red-500'
                                    : budget.totalSpent > budget.totalAllocated * 0.8
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                                style={{
                                  width: `${Math.min((budget.totalSpent / budget.totalAllocated) * 100, 100)}%`
                                }}
                              ></div>
                            </div>

                            {/* Variance Indicator */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                {budget.overallVariance > 0 ? (
                                  <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                )}
                                <span className={`text-sm font-medium ${
                                  budget.overallVariance > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {budget.overallVariance > 0 ? 'Over' : 'Under'} budget by {Math.abs(budget.overallVariance).toFixed(1)}%
                                </span>
                              </div>
                              <button
                                onClick={() => setSelectedBudget(budget)}
                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </div>

                            {/* Category Breakdown */}
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-gray-700">Category Breakdown</h5>
                              {budget.categories.slice(0, 3).map((category, index) => (
                                <div key={index} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center">
                                    <div
                                      className="w-3 h-3 rounded-full mr-2"
                                      style={{ backgroundColor: categoryColors[category.category] }}
                                    ></div>
                                    <span className="capitalize">{category.category}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-medium">
                                      {formatCurrency(category.spent_amount || 0, category.currency)}
                                    </span>
                                    <span className="text-gray-500 ml-1">
                                      / {formatCurrency(category.allocated_amount, category.currency)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {budget.categories.length > 3 && (
                                <p className="text-xs text-gray-500">
                                  +{budget.categories.length - 3} more categories
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Create Budget */}
              {activeTab === 'create' && (
                <div className="space-y-6">
                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-6">Create New Budget</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Budget Name</label>
                        <input
                          type="text"
                          value={newBudget.name}
                          onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="e.g., Q1 2024 Budget"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Period</label>
                        <select
                          value={newBudget.period}
                          onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value as BudgetPeriod })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={newBudget.start_date}
                          onChange={(e) => setNewBudget({ ...newBudget, start_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={newBudget.end_date}
                          onChange={(e) => setNewBudget({ ...newBudget, end_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={newBudget.description}
                          onChange={(e) => setNewBudget({ ...newBudget, description: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3}
                          placeholder="Optional description for this budget"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modern-card p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-semibold text-gray-800">Budget Categories</h4>
                      <button
                        onClick={addBudgetCategory}
                        className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Category
                      </button>
                    </div>

                    {budgetCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No categories added yet. Click "Add Category" to start.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {budgetCategories.map((category, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                              <select
                                value={category.category}
                                onChange={(e) => updateBudgetCategory(index, 'category', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
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

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                              <input
                                type="number"
                                value={category.allocated_amount}
                                onChange={(e) => updateBudgetCategory(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                              <select
                                value={category.currency}
                                onChange={(e) => updateBudgetCategory(index, 'currency', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="AED">AED</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                              </select>
                            </div>

                            <div className="flex items-end">
                              <button
                                onClick={() => removeBudgetCategory(index)}
                                className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg flex items-center justify-center"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createBudget}
                      disabled={!newBudget.name || budgetCategories.length === 0}
                      className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Budget
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
