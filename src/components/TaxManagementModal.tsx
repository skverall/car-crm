'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Expense, Car, CurrencyType } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils'
import {
  X,
  Calculator,
  FileText,
  Download,
  Calendar,
  DollarSign,
  Percent,
  Receipt,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Building
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie
} from 'recharts'

interface TaxManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

interface TaxSummary {
  totalRevenue: number
  totalExpenses: number
  taxableIncome: number
  vatCollected: number
  vatPaid: number
  netVat: number
  incomeTax: number
  totalTaxLiability: number
}

interface TaxableTransaction {
  id: string
  type: 'sale' | 'expense'
  description: string
  amount: number
  currency: CurrencyType
  date: string
  vatRate: number
  vatAmount: number
  isVatExempt: boolean
}

export default function TaxManagementModal({ isOpen, onClose }: TaxManagementModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'summary' | 'vat' | 'income' | 'reports'>('summary')
  const [taxPeriod, setTaxPeriod] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [taxSummary, setTaxSummary] = useState<TaxSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    taxableIncome: 0,
    vatCollected: 0,
    vatPaid: 0,
    netVat: 0,
    incomeTax: 0,
    totalTaxLiability: 0
  })
  const [taxableTransactions, setTaxableTransactions] = useState<TaxableTransaction[]>([])
  const [vatSettings, setVatSettings] = useState({
    standardRate: 5, // UAE VAT rate
    isVatRegistered: true,
    vatNumber: '',
    incomeTaxRate: 0 // UAE has no personal income tax, but corporate tax exists
  })
  const supabase = createClient()

  const calculateTaxes = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch sales (revenue) data
      const { data: salesData } = await supabase
        .from('cars')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .gte('sale_date', taxPeriod.startDate)
        .lte('sale_date', taxPeriod.endDate)

      // Fetch expenses data
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('expense_date', taxPeriod.startDate)
        .lte('expense_date', taxPeriod.endDate)

      // Calculate revenue
      const totalRevenue = salesData?.reduce((sum, car) => {
        if (!car.sale_price) return sum
        const rate = car.sale_currency === 'USD' ? 3.67 : 
                    car.sale_currency === 'EUR' ? 4.00 : 
                    car.sale_currency === 'GBP' ? 4.60 : 1
        return sum + (car.sale_price * rate)
      }, 0) || 0

      // Calculate expenses
      const totalExpenses = expensesData?.reduce((sum, expense) => {
        const rate = expense.currency === 'USD' ? 3.67 : 
                    expense.currency === 'EUR' ? 4.00 : 
                    expense.currency === 'GBP' ? 4.60 : 1
        return sum + (expense.amount * rate)
      }, 0) || 0

      // Calculate VAT
      const vatCollected = vatSettings.isVatRegistered ? (totalRevenue * vatSettings.standardRate) / 100 : 0
      const vatPaid = vatSettings.isVatRegistered ? (totalExpenses * vatSettings.standardRate) / 100 : 0
      const netVat = vatCollected - vatPaid

      // Calculate taxable income and income tax
      const taxableIncome = totalRevenue - totalExpenses
      const incomeTax = taxableIncome > 0 ? (taxableIncome * vatSettings.incomeTaxRate) / 100 : 0

      const totalTaxLiability = Math.max(netVat, 0) + incomeTax

      setTaxSummary({
        totalRevenue,
        totalExpenses,
        taxableIncome,
        vatCollected,
        vatPaid,
        netVat,
        incomeTax,
        totalTaxLiability
      })

      // Create taxable transactions list
      const transactions: TaxableTransaction[] = []

      // Add sales transactions
      salesData?.forEach(car => {
        if (car.sale_price) {
          const amountAED = convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED')
          transactions.push({
            id: car.id,
            type: 'sale',
            description: `Sale of ${car.year} ${car.make} ${car.model}`,
            amount: amountAED,
            currency: 'AED',
            date: car.sale_date || '',
            vatRate: vatSettings.standardRate,
            vatAmount: vatSettings.isVatRegistered ? (amountAED * vatSettings.standardRate) / 100 : 0,
            isVatExempt: !vatSettings.isVatRegistered
          })
        }
      })

      // Add expense transactions
      expensesData?.forEach(expense => {
        const amountAED = convertCurrency(expense.amount, expense.currency, 'AED')
        transactions.push({
          id: expense.id,
          type: 'expense',
          description: expense.description,
          amount: amountAED,
          currency: 'AED',
          date: expense.expense_date,
          vatRate: vatSettings.standardRate,
          vatAmount: vatSettings.isVatRegistered ? (amountAED * vatSettings.standardRate) / 100 : 0,
          isVatExempt: !vatSettings.isVatRegistered
        })
      })

      setTaxableTransactions(transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))

    } catch (error) {
      console.error('Error calculating taxes:', error)
    } finally {
      setLoading(false)
    }
  }, [taxPeriod, vatSettings, supabase])

  useEffect(() => {
    if (isOpen) {
      calculateTaxes()
    }
  }, [isOpen, calculateTaxes])

  const exportTaxReport = () => {
    const csvData = [
      ['Tax Report', `${taxPeriod.startDate} to ${taxPeriod.endDate}`],
      [''],
      ['Tax Summary'],
      ['Total Revenue', taxSummary.totalRevenue.toFixed(2)],
      ['Total Expenses', taxSummary.totalExpenses.toFixed(2)],
      ['Taxable Income', taxSummary.taxableIncome.toFixed(2)],
      ['VAT Collected', taxSummary.vatCollected.toFixed(2)],
      ['VAT Paid', taxSummary.vatPaid.toFixed(2)],
      ['Net VAT', taxSummary.netVat.toFixed(2)],
      ['Income Tax', taxSummary.incomeTax.toFixed(2)],
      ['Total Tax Liability', taxSummary.totalTaxLiability.toFixed(2)],
      [''],
      ['Taxable Transactions'],
      ['Date', 'Type', 'Description', 'Amount', 'VAT Rate', 'VAT Amount'],
      ...taxableTransactions.map(tx => [
        tx.date,
        tx.type,
        tx.description,
        tx.amount.toFixed(2),
        `${tx.vatRate}%`,
        tx.vatAmount.toFixed(2)
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax-report-${taxPeriod.startDate}-${taxPeriod.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  const vatData = [
    { name: 'VAT Collected', value: taxSummary.vatCollected, color: '#10B981' },
    { name: 'VAT Paid', value: taxSummary.vatPaid, color: '#EF4444' }
  ].filter(item => item.value > 0)

  return (
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-7xl mb-10">
        <div className="modal-content p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center mr-4">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-800">Tax Management</h3>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportTaxReport}
                className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Tax Period Selection */}
          <div className="mb-8 modern-card p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">Tax Period</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={taxPeriod.startDate}
                  onChange={(e) => setTaxPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={taxPeriod.endDate}
                  onChange={(e) => setTaxPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={calculateTaxes}
                  disabled={loading}
                  className="w-full btn-primary px-4 py-3 rounded-lg flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Calculate
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'summary', name: 'Tax Summary', icon: DollarSign },
                { id: 'vat', name: 'VAT Analysis', icon: Percent },
                { id: 'income', name: 'Income Tax', icon: Building },
                { id: 'reports', name: 'Tax Reports', icon: FileText }
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
              {/* Tax Summary */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrency(taxSummary.totalRevenue, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                          <Receipt className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                          <p className="text-2xl font-bold text-gray-800">
                            {formatCurrency(taxSummary.totalExpenses, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          taxSummary.taxableIncome >= 0
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                            : 'bg-gradient-to-r from-red-400 to-red-600'
                        }`}>
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Taxable Income</p>
                          <p className={`text-2xl font-bold ${
                            taxSummary.taxableIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(taxSummary.taxableIncome, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="metric-card p-6">
                      <div className="flex items-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          taxSummary.totalTaxLiability > 0
                            ? 'bg-gradient-to-r from-orange-400 to-orange-600'
                            : 'bg-gradient-to-r from-gray-400 to-gray-600'
                        }`}>
                          <Calculator className="h-6 w-6 text-white" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">Tax Liability</p>
                          <p className={`text-2xl font-bold ${
                            taxSummary.totalTaxLiability > 0 ? 'text-orange-600' : 'text-gray-600'
                          }`}>
                            {formatCurrency(taxSummary.totalTaxLiability, 'AED')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tax Breakdown */}
                  <div className="modern-card p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Tax Breakdown</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="font-medium text-gray-700">VAT Collected</span>
                        <span className="font-bold text-green-600">
                          +{formatCurrency(taxSummary.vatCollected, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="font-medium text-gray-700">VAT Paid</span>
                        <span className="font-bold text-red-600">
                          -{formatCurrency(taxSummary.vatPaid, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="font-medium text-gray-700">Net VAT</span>
                        <span className={`font-bold ${
                          taxSummary.netVat >= 0 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {taxSummary.netVat >= 0 ? '+' : ''}{formatCurrency(taxSummary.netVat, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-3 border-b border-gray-100">
                        <span className="font-medium text-gray-700">Income Tax</span>
                        <span className="font-bold text-orange-600">
                          +{formatCurrency(taxSummary.incomeTax, 'AED')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-4 border-t-2 border-gray-200">
                        <span className="text-lg font-bold text-gray-800">Total Tax Liability</span>
                        <span className="text-lg font-bold text-orange-600">
                          {formatCurrency(taxSummary.totalTaxLiability, 'AED')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VAT Analysis */}
              {activeTab === 'vat' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="modern-card p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">VAT Overview</h4>
                      {vatData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={vatData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${formatCurrency(value, 'AED')}`}
                            >
                              {vatData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value, 'AED')} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-center py-12">
                          <Percent className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No VAT data</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            Enable VAT registration to track VAT transactions.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="modern-card p-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">VAT Settings</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">VAT Registered</span>
                          <input
                            type="checkbox"
                            checked={vatSettings.isVatRegistered}
                            onChange={(e) => setVatSettings({ ...vatSettings, isVatRegistered: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
                          <input
                            type="number"
                            value={vatSettings.standardRate}
                            onChange={(e) => setVatSettings({ ...vatSettings, standardRate: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                          <input
                            type="text"
                            value={vatSettings.vatNumber}
                            onChange={(e) => setVatSettings({ ...vatSettings, vatNumber: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Enter VAT registration number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Income Tax Rate (%)</label>
                          <input
                            type="number"
                            value={vatSettings.incomeTaxRate}
                            onChange={(e) => setVatSettings({ ...vatSettings, incomeTaxRate: parseFloat(e.target.value) || 0 })}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                      </div>
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
