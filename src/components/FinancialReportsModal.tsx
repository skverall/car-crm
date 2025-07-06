'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Expense, CashTransaction } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils'
import {
  X,
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Filter
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
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'

interface FinancialReportsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ReportData {
  profitLoss: {
    revenue: number
    expenses: number
    netProfit: number
    grossMargin: number
  }
  cashFlow: {
    operatingCashFlow: number
    investingCashFlow: number
    financingCashFlow: number
    netCashFlow: number
  }
  expenseBreakdown: Array<{
    category: string
    amount: number
    percentage: number
    color: string
  }>
  monthlyTrends: Array<{
    month: string
    revenue: number
    expenses: number
    profit: number
  }>
}

export default function FinancialReportsModal({ isOpen, onClose }: FinancialReportsModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeReport, setActiveReport] = useState<'pl' | 'cashflow' | 'expenses' | 'trends'>('pl')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportData, setReportData] = useState<ReportData>({
    profitLoss: { revenue: 0, expenses: 0, netProfit: 0, grossMargin: 0 },
    cashFlow: { operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0, netCashFlow: 0 },
    expenseBreakdown: [],
    monthlyTrends: []
  })
  const supabase = createClient()

  const fetchReportData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch cars sold in date range
      const { data: soldCars } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .gte('sale_date', dateRange.startDate)
        .lte('sale_date', dateRange.endDate)

      // Fetch expenses in date range
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', dateRange.startDate)
        .lte('expense_date', dateRange.endDate)

      // Fetch cash transactions in date range
      const { data: transactions } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', dateRange.startDate)
        .lte('transaction_date', dateRange.endDate)

      // Calculate P&L
      const revenue = soldCars?.reduce((sum, car) => {
        if (!car.sale_price) return sum
        const rate = car.sale_currency === 'USD' ? 3.67 : 
                    car.sale_currency === 'EUR' ? 4.00 : 
                    car.sale_currency === 'GBP' ? 4.60 : 1
        return sum + (car.sale_price * rate)
      }, 0) || 0

      const totalExpenses = expenses?.reduce((sum, expense) => {
        const rate = expense.currency === 'USD' ? 3.67 : 
                    expense.currency === 'EUR' ? 4.00 : 
                    expense.currency === 'GBP' ? 4.60 : 1
        return sum + (expense.amount * rate)
      }, 0) || 0

      const netProfit = revenue - totalExpenses
      const grossMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

      // Calculate expense breakdown
      const expenseCategories = expenses?.reduce((acc, expense) => {
        const amountAED = convertCurrency(expense.amount, expense.currency, 'AED')
        if (!acc[expense.category]) {
          acc[expense.category] = 0
        }
        acc[expense.category] += amountAED
        return acc
      }, {} as Record<string, number>) || {}

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

      const expenseBreakdown = Object.entries(expenseCategories).map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        color: categoryColors[category as keyof typeof categoryColors] || '#6B7280'
      }))

      // Calculate monthly trends
      const monthlyData = soldCars?.reduce((acc, car) => {
        if (!car.sale_date) return acc
        const month = new Date(car.sale_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        if (!acc[month]) {
          acc[month] = { month, revenue: 0, expenses: 0, profit: 0 }
        }
        const saleAmountAED = car.sale_price ? convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED') : 0
        acc[month].revenue += saleAmountAED
        return acc
      }, {} as Record<string, { month: string; revenue: number; expenses: number; profit: number }>) || {}

      // Add expenses to monthly data
      expenses?.forEach(expense => {
        const month = new Date(expense.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        if (!monthlyData[month]) {
          monthlyData[month] = { month, revenue: 0, expenses: 0, profit: 0 }
        }
        monthlyData[month].expenses += convertCurrency(expense.amount, expense.currency, 'AED')
      })

      // Calculate profit for each month
      Object.values(monthlyData).forEach(data => {
        data.profit = data.revenue - data.expenses
      })

      const monthlyTrends = Object.values(monthlyData).sort((a, b) => 
        new Date(a.month).getTime() - new Date(b.month).getTime()
      )

      // Calculate cash flow (simplified)
      const operatingCashFlow = revenue - totalExpenses
      const investingCashFlow = 0 // Could be calculated from asset purchases
      const financingCashFlow = 0 // Could be calculated from loans/investments
      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow

      setReportData({
        profitLoss: { revenue, expenses: totalExpenses, netProfit, grossMargin },
        cashFlow: { operatingCashFlow, investingCashFlow, financingCashFlow, netCashFlow },
        expenseBreakdown,
        monthlyTrends
      })
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange, supabase])

  useEffect(() => {
    if (isOpen) {
      fetchReportData()
    }
  }, [isOpen, fetchReportData])

  if (!isOpen) return null

  const exportReport = () => {
    // Simple CSV export functionality
    const csvData = [
      ['Financial Report', `${dateRange.startDate} to ${dateRange.endDate}`],
      [''],
      ['Profit & Loss'],
      ['Revenue', reportData.profitLoss.revenue.toFixed(2)],
      ['Expenses', reportData.profitLoss.expenses.toFixed(2)],
      ['Net Profit', reportData.profitLoss.netProfit.toFixed(2)],
      ['Gross Margin %', reportData.profitLoss.grossMargin.toFixed(2)],
      [''],
      ['Expense Breakdown'],
      ...reportData.expenseBreakdown.map(item => [item.category, item.amount.toFixed(2), `${item.percentage.toFixed(1)}%`])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financial-report-${dateRange.startDate}-${dateRange.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-7xl mb-10">
        <div className="modal-content p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">Financial Reports</h3>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportReport}
                className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="mb-8 modern-card p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Report Period</h4>
            <div className="flex items-center space-x-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="block border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="block border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Report Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'pl', name: 'Profit & Loss', icon: TrendingUp },
                { id: 'cashflow', name: 'Cash Flow', icon: DollarSign },
                { id: 'expenses', name: 'Expense Analysis', icon: PieChart },
                { id: 'trends', name: 'Monthly Trends', icon: BarChart3 }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveReport(tab.id as any)}
                    className={`${
                      activeReport === tab.id
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
              {/* Profit & Loss Report */}
              {activeReport === 'pl' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrency(reportData.profitLoss.revenue, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-red-400 to-red-600 rounded-xl flex items-center justify-center">
                          <TrendingDown className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrency(reportData.profitLoss.expenses, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          reportData.profitLoss.netProfit >= 0
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                            : 'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}>
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Net Profit</p>
                          <p className={`text-2xl font-bold ${
                            reportData.profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-orange-600'
                          }`}>
                            {reportData.profitLoss.netProfit >= 0 ? '+' : ''}{formatCurrency(reportData.profitLoss.netProfit, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Gross Margin</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {reportData.profitLoss.grossMargin.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Profit & Loss Statement</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-700">Revenue</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(reportData.profitLoss.revenue, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="font-medium text-gray-700">Total Expenses</span>
                        <span className="font-bold text-red-600">
                          -{formatCurrency(reportData.profitLoss.expenses, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-t-2 border-gray-200">
                        <span className="text-lg font-bold text-gray-800">Net Profit</span>
                        <span className={`text-lg font-bold ${
                          reportData.profitLoss.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {reportData.profitLoss.netProfit >= 0 ? '+' : ''}{formatCurrency(reportData.profitLoss.netProfit, 'AED')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Flow Report */}
              {activeReport === 'cashflow' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Operating Cash Flow</p>
                          <p className="text-xl font-bold text-gray-800">
                            {formatCurrency(reportData.cashFlow.operatingCashFlow, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Investing Cash Flow</p>
                          <p className="text-xl font-bold text-gray-800">
                            {formatCurrency(reportData.cashFlow.investingCashFlow, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                          <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Financing Cash Flow</p>
                          <p className="text-xl font-bold text-gray-800">
                            {formatCurrency(reportData.cashFlow.financingCashFlow, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          reportData.cashFlow.netCashFlow >= 0
                            ? 'bg-gradient-to-r from-green-400 to-green-600'
                            : 'bg-gradient-to-r from-red-400 to-red-600'
                        }`}>
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Net Cash Flow</p>
                          <p className={`text-xl font-bold ${
                            reportData.cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {reportData.cashFlow.netCashFlow >= 0 ? '+' : ''}{formatCurrency(reportData.cashFlow.netCashFlow, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Analysis */}
              {activeReport === 'expenses' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="modern-card p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Expense Breakdown</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value, 'AED'), 'Amount']}
                          />
                          <RechartsPieChart data={reportData.expenseBreakdown}>
                            {reportData.expenseBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </RechartsPieChart>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="modern-card p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Category Details</h4>
                      <div className="space-y-3">
                        {reportData.expenseBreakdown.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                              <div
                                className="w-4 h-4 rounded-full mr-3"
                                style={{ backgroundColor: item.color }}
                              ></div>
                              <span className="font-medium text-gray-700">{item.category}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-800">
                                {formatCurrency(item.amount, 'AED')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Trends */}
              {activeReport === 'trends' && (
                <div className="space-y-6">
                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Revenue vs Expenses Trend</h4>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={reportData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value, 'AED'), '']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stackId="1"
                          stroke="#10B981"
                          fill="#10B981"
                          fillOpacity={0.6}
                          name="Revenue"
                        />
                        <Area
                          type="monotone"
                          dataKey="expenses"
                          stackId="2"
                          stroke="#EF4444"
                          fill="#EF4444"
                          fillOpacity={0.6}
                          name="Expenses"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Monthly Profit Trend</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData.monthlyTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value, 'AED'), 'Profit']}
                        />
                        <Line
                          type="monotone"
                          dataKey="profit"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Monthly Summary</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Month
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Expenses
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Profit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Margin %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {reportData.monthlyTrends.map((month, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {month.month}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(month.revenue, 'AED')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(month.expenses, 'AED')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`font-medium ${
                                  month.profit >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit, 'AED')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : '0.0'}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
