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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  FileText,
  Calculator
} from 'lucide-react'
import AddExpenseModalAdvanced from './AddExpenseModalAdvanced'
import AnalyticsModal from './AnalyticsModal'
import ExpenseDetailModal from './ExpenseDetailModal'
import FinancialReportsModal from './FinancialReportsModal'
import BudgetManagementModal from './BudgetManagementModal'
import TaxManagementModal from './TaxManagementModal'

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
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showTaxModal, setShowTaxModal] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null)
  const [financialMetrics, setFinancialMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    roi: 0,
    avgDaysToSell: 0,
    cashFlow: 0,
    monthlyGrowth: 0,
    expenseGrowth: 0,
    activeCars: 0,
    soldCarsThisMonth: 0,
    pendingExpenses: 0
  })
  const supabase = createClient()

  useEffect(() => {
    fetchData()
    calculateFinancialMetrics()
  }, [])

  const calculateFinancialMetrics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current month dates
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

      // Fetch car profit analysis for revenue and profit calculations
      const { data: carAnalysis } = await supabase
        .from('car_profit_analysis')
        .select('*')
        .eq('user_id', user.id)

      // Fetch all expenses for expense calculations
      const { data: allExpenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)

      // Fetch current month data
      const { data: currentMonthCars } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .gte('sale_date', currentMonthStart)

      const { data: lastMonthCars } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .gte('sale_date', lastMonthStart)
        .lte('sale_date', lastMonthEnd)

      // Calculate metrics
      const soldCars = carAnalysis?.filter(car => car.status === 'sold') || []
      const totalRevenue = soldCars.reduce((sum, car) => {
        if (!car.sale_price) return sum
        // Convert to AED
        const rate = car.sale_currency === 'USD' ? 3.67 :
                    car.sale_currency === 'EUR' ? 4.00 :
                    car.sale_currency === 'GBP' ? 4.60 : 1
        return sum + (car.sale_price * rate)
      }, 0)

      const totalExpenses = allExpenses?.reduce((sum, expense) => {
        const rate = expense.currency === 'USD' ? 3.67 :
                    expense.currency === 'EUR' ? 4.00 :
                    expense.currency === 'GBP' ? 4.60 : 1
        return sum + (expense.amount * rate)
      }, 0) || 0

      const netProfit = soldCars.reduce((sum, car) => sum + (car.profit_aed || 0), 0)
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

      // Calculate ROI (Return on Investment)
      const totalInvestment = soldCars.reduce((sum, car) => {
        const rate = car.purchase_currency === 'USD' ? 3.67 :
                    car.purchase_currency === 'EUR' ? 4.00 :
                    car.purchase_currency === 'GBP' ? 4.60 : 1
        return sum + (car.purchase_price * rate)
      }, 0)
      const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0

      const avgDaysToSell = soldCars.length > 0 ?
        soldCars.reduce((sum, car) => sum + (car.days_to_sell || 0), 0) / soldCars.length : 0

      // Calculate monthly growth
      const currentMonthRevenue = currentMonthCars?.reduce((sum, car) => {
        if (!car.sale_price) return sum
        const rate = car.sale_currency === 'USD' ? 3.67 :
                    car.sale_currency === 'EUR' ? 4.00 :
                    car.sale_currency === 'GBP' ? 4.60 : 1
        return sum + (car.sale_price * rate)
      }, 0) || 0

      const lastMonthRevenue = lastMonthCars?.reduce((sum, car) => {
        if (!car.sale_price) return sum
        const rate = car.sale_currency === 'USD' ? 3.67 :
                    car.sale_currency === 'EUR' ? 4.00 :
                    car.sale_currency === 'GBP' ? 4.60 : 1
        return sum + (car.sale_price * rate)
      }, 0) || 0

      const monthlyGrowth = lastMonthRevenue > 0 ?
        ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      // Get active cars count
      const { data: activeCarsData } = await supabase
        .from('cars')
        .select('id')
        .eq('user_id', user.id)
        .in('status', ['in_transit', 'for_sale', 'reserved'])

      setFinancialMetrics({
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        roi,
        avgDaysToSell,
        cashFlow: totalRevenue - totalExpenses,
        monthlyGrowth,
        expenseGrowth: 0, // Could be calculated similarly
        activeCars: activeCarsData?.length || 0,
        soldCarsThisMonth: currentMonthCars?.length || 0,
        pendingExpenses: 0 // Could be calculated from pending transactions
      })
    } catch (error) {
      console.error('Error calculating financial metrics:', error)
    }
  }

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

      // Calculate financial metrics after data is loaded
      await calculateFinancialMetrics()
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

      {/* Enhanced Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Revenue */}
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(financialMetrics.totalRevenue, 'AED')}
              </p>
              <div className="flex items-center mt-1">
                {financialMetrics.monthlyGrowth >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <p className={`text-xs font-medium ${
                  financialMetrics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {Math.abs(financialMetrics.monthlyGrowth).toFixed(1)}% vs last month
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                financialMetrics.netProfit >= 0
                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                  : 'bg-gradient-to-r from-red-400 to-red-600'
              }`}>
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
              <p className={`text-2xl font-bold ${
                financialMetrics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {financialMetrics.netProfit >= 0 ? '+' : ''}{formatCurrency(financialMetrics.netProfit, 'AED')}
              </p>
              <div className="flex items-center mt-1">
                <Percent className="h-3 w-3 text-gray-500 mr-1" />
                <p className="text-xs text-gray-500">
                  {financialMetrics.profitMargin.toFixed(1)}% margin
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ROI */}
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">ROI</p>
              <p className={`text-2xl font-bold ${
                financialMetrics.roi >= 0 ? 'text-purple-600' : 'text-red-600'
              }`}>
                {financialMetrics.roi >= 0 ? '+' : ''}{financialMetrics.roi.toFixed(1)}%
              </p>
              <div className="flex items-center mt-1">
                <Calendar className="h-3 w-3 text-gray-500 mr-1" />
                <p className="text-xs text-gray-500">
                  {Math.round(financialMetrics.avgDaysToSell)} avg days to sell
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                financialMetrics.cashFlow >= 0
                  ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                  : 'bg-gradient-to-r from-orange-400 to-orange-600'
              }`}>
                {financialMetrics.cashFlow >= 0 ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Cash Flow</p>
              <p className={`text-2xl font-bold ${
                financialMetrics.cashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'
              }`}>
                {financialMetrics.cashFlow >= 0 ? '+' : ''}{formatCurrency(financialMetrics.cashFlow, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {financialMetrics.activeCars} active cars
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
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
              <p className="text-xs text-gray-500 mt-1">{carExpenses.length} operations</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Other Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalOtherExpenses, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{otherExpenses.length} operations</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center">
                <PieChart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-800">
                {formatCurrency(totalCarExpenses + totalOtherExpenses, 'AED')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{expenses.length} operations total</p>
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
            onClick={() => setShowTaxModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Tax
          </button>
          <button
            onClick={() => setShowBudgetModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <Target className="h-5 w-5 mr-2" />
            Budgets
          </button>
          <button
            onClick={() => setShowReportsModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <FileText className="h-5 w-5 mr-2" />
            Reports
          </button>
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

      {/* Financial Reports Modal */}
      <FinancialReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
      />

      {/* Budget Management Modal */}
      <BudgetManagementModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
      />

      {/* Tax Management Modal */}
      <TaxManagementModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
      />
    </div>
  )
}
