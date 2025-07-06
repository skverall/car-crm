'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel, formatDate, formatRelativeTime } from '@/lib/utils'
import { useOptimizedCalculation, usePerformanceMonitor } from '@/hooks/usePerformance'
import { useApiErrorHandler } from '@/hooks/useErrorHandler'
import {
  Car as CarIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  BarChart3,
  Banknote,
  CreditCard,
  Clock,
  Package,
  Target,
  Calendar
} from 'lucide-react'
import AddCarModal from './AddCarModal'
import CarDetailModal from './CarDetailModal'
import AnalyticsModal from './AnalyticsModal'

interface DashboardProps {
  onDataUpdate?: () => void
  onPageChange?: (page: 'dashboard' | 'inventory' | 'finance' | 'customers' | 'debts') => void
}

export default function Dashboard({ onDataUpdate, onPageChange }: DashboardProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const supabase = createClient()

  // Performance monitoring
  usePerformanceMonitor('Dashboard')

  // Error handling
  const { handleError } = useApiErrorHandler()

  const fetchCars = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setCars([])
        return
      }

      const { data, error } = await supabase
        .from('car_profit_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setCars(data || [])
    } catch (error) {
      handleError(error, 'fetch_cars', 'Failed to load vehicle data')
    } finally {
      setLoading(false)
    }
  }, [supabase, handleError])

  useEffect(() => {
    fetchCars()
  }, [fetchCars])

  const handleCarClick = (carId: string) => {
    setSelectedCarId(carId)
    setShowDetailModal(true)
  }

  // Optimized filtering with memoization
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      const matchesSearch = car.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           car.model.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || car.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [cars, searchTerm, statusFilter])

  // Separate unsold cars for inventory calculations
  const unsoldCars = useMemo(() =>
    cars.filter(car => car.status !== 'sold'),
    [cars]
  )

  // Optimized statistics calculation
  const stats = useOptimizedCalculation(cars, (carsData) => ({
    totalCars: carsData.length,
    unsoldCars: carsData.filter(car => car.status !== 'sold').length,
    inTransit: carsData.filter(car => car.status === 'in_transit').length,
    forSale: carsData.filter(car => car.status === 'for_sale').length,
    sold: carsData.filter(car => car.status === 'sold').length,
    reserved: carsData.filter(car => car.status === 'reserved').length,
    totalProfit: carsData
      .filter(car => car.profit_aed !== null)
      .reduce((sum, car) => sum + (car.profit_aed || 0), 0),
    // Only count purchase cost for unsold cars (current inventory value)
    totalPurchaseCost: carsData
      .filter(car => car.status !== 'sold')
      .reduce((sum, car) => {
        return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
      }, 0),
    // Total cost including expenses for unsold cars
    totalInventoryValue: carsData
      .filter(car => car.status !== 'sold')
      .reduce((sum, car) => {
        return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED') + (car.total_expenses_aed || 0)
      }, 0),
    totalSaleValue: carsData
      .filter(car => car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Cash payments total
    cashPayments: carsData
      .filter(car => car.status === 'sold' && car.payment_method === 'cash' && car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Bank/Card payments total
    bankPayments: carsData
      .filter(car => car.status === 'sold' && car.payment_method === 'bank_card' && car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Stock Summary - total cost of unsold inventory
    stockValue: carsData
      .filter(car => car.status !== 'sold')
      .reduce((sum, car) => {
        return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
      }, 0),
    // Average days to sell for sold cars
    avgDaysToSell: (() => {
      const soldCarsWithDays = carsData.filter(car => car.status === 'sold' && car.days_to_sell)
      if (soldCarsWithDays.length === 0) return 0
      const totalDays = soldCarsWithDays.reduce((sum, car) => sum + (car.days_to_sell || 0), 0)
      return Math.round(totalDays / soldCarsWithDays.length)
    })(),
    // Monthly sales (cars sold this month)
    monthlySales: carsData.filter(car => {
      if (!car.sale_date) return false
      const saleDate = new Date(car.sale_date)
      const now = new Date()
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
    }).length
  }), [cars])

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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600 text-lg">Overview of your vehicle inventory and business performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Car
          </button>
        </div>
      </div>
        {/* Stats - First Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Cars */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('inventory')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <CarIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Cars</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalCars}</p>
                <p className="text-xs text-gray-500 mt-1">In inventory</p>
              </div>
            </div>
          </div>

          {/* Cars Sold */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('inventory')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Cars Sold</p>
                <p className="text-2xl font-bold text-gray-800">{stats.sold}</p>
                <p className="text-xs text-gray-500 mt-1">Completed sales</p>
              </div>
            </div>
          </div>

          {/* Inventory Value */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('finance')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.stockValue, 'AED')}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total investment</p>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('finance')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.totalSaleValue, 'AED')}
                </p>
                <p className="text-xs text-gray-500 mt-1">From sales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats - Second Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Profit */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setShowAnalyticsModal(true)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Profit</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.totalProfit, 'AED')}
                </p>
                <p className="text-xs text-gray-500 mt-1">Net earnings</p>
              </div>
            </div>
          </div>

          {/* Average Days to Sell */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => setShowAnalyticsModal(true)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Avg Days to Sell</p>
                <p className="text-2xl font-bold text-gray-800">{stats.avgDaysToSell}</p>
                <p className="text-xs text-gray-500 mt-1">Average time</p>
              </div>
            </div>
          </div>

          {/* Monthly Sales */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('inventory')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Monthly Sales</p>
                <p className="text-2xl font-bold text-gray-800">{stats.monthlySales}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div
            className="metric-card p-6 cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => onPageChange('cash')}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-400 to-red-500 rounded-xl flex items-center justify-center">
                  <div className="flex space-x-1">
                    <Banknote className="h-3 w-3 text-white" />
                    <CreditCard className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Cash Payments</p>
                <p className="text-2xl font-bold text-gray-800">
                  {formatCurrency(stats.cashPayments, 'AED')}
                </p>
                <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(stats.bankPayments, 'AED')} bank</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Cars Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Recent Cars</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onPageChange('inventory')}
                className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <Search className="h-4 w-4 mr-2" />
                View All Cars
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Car
              </button>
            </div>
          </div>
          {/* Recent Cars List */}
          <div className="modern-card">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Recent Cars</h3>
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                  <option>All Status</option>
                  <option>For Sale</option>
                  <option>Sold</option>
                  <option>In Transit</option>
                  <option>Reserved</option>
                </select>
              </div>
            </div>
            <div className="p-6">
              {cars.length > 0 ? (
                <div className="space-y-4">
                  {cars.slice(0, 5).map((car) => (
                    <div
                      key={car.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all duration-200 cursor-pointer"
                      onClick={() => handleCarClick(car.id)}
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                          <CarIcon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{car.year} {car.make} {car.model}</p>
                          <p className="text-sm text-gray-600">VIN: {car.vin} • Added {car.created_at ? formatRelativeTime(car.created_at) : 'Recently'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                          {getStatusLabel(car.status)}
                        </span>
                        <p className="text-sm font-semibold text-gray-800 mt-1">
                          {formatCurrency(car.purchase_price, car.purchase_currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No cars yet</h3>
                  <p className="text-gray-600 mb-4">Get started by adding your first car to the inventory.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary px-4 py-2 rounded-lg flex items-center mx-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Car
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search by VIN, make, or model..."
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
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="in_transit">In Transit</option>
                  <option value="for_sale">For Sale</option>
                  <option value="sold">Sold</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        {(stats.inTransit > 0 || stats.forSale === 0) && (
          <div className="mb-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Attention Required</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {stats.inTransit > 0 && (
                        <li>{stats.inTransit} car{stats.inTransit > 1 ? 's' : ''} still in transit</li>
                      )}
                      {stats.forSale === 0 && stats.unsoldCars > 0 && (
                        <li>No cars currently marked for sale</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Business Statistics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:px-6 border-b border-gray-200">
              <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Business Statistics</h3>
            </div>
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500 truncate">Total Inventory Value</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 ml-2">
                    {formatCurrency(stats.totalInventoryValue, 'AED')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Profit Margin</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {(() => {
                      const totalCost = stats.totalSaleValue - stats.totalProfit
                      return totalCost > 0 ? Math.round((stats.totalProfit / totalCost) * 100) : 0
                    })()}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Cash vs Bank Ratio</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {stats.totalSaleValue > 0 ? Math.round((stats.cashPayments / stats.totalSaleValue) * 100) : 0}% Cash
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Inventory Turnover</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {stats.unsoldCars > 0 ? Math.round(stats.sold / stats.unsoldCars * 100) / 100 : 0}x
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:px-6 border-b border-gray-200">
              <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">Key Metrics</h3>
            </div>
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500 truncate">Avg Profit per Sale</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 ml-2">
                    {stats.sold > 0 ? formatCurrency(stats.totalProfit / stats.sold, 'AED') : formatCurrency(0, 'AED')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Success Rate</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {stats.totalCars > 0 ? Math.round((stats.sold / stats.totalCars) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">Cars for Sale</span>
                  <span className="text-xs sm:text-sm font-medium text-blue-600">{stats.forSale}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-500">In Transit</span>
                  <span className="text-xs sm:text-sm font-medium text-yellow-600">{stats.inTransit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cars Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:px-6 flex justify-between items-center">
            <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
              Vehicle Inventory ({filteredCars.length})
            </h3>
            <button
              onClick={() => onPageChange('inventory')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all cars →
            </button>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredCars.map((car) => (
              <li
                key={car.id}
                className="px-3 py-3 sm:px-4 sm:py-4 hover:bg-gray-50 cursor-pointer touch-manipulation"
                onClick={() => handleCarClick(car.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="flex-shrink-0">
                      {car.photo_url ? (
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          <img
                            src={car.photo_url}
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                          <CarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 hidden" />
                        </div>
                      ) : (
                        <CarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                      <div className="flex items-center flex-wrap">
                        <p className="text-sm sm:text-lg font-medium text-gray-900 truncate">{car.year} {car.make} {car.model}</p>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                          {getStatusLabel(car.status)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 font-mono truncate">
                        VIN: {car.vin}
                      </p>
                      <p className="text-xs text-gray-400">
                        Added {car.created_at ? formatRelativeTime(car.created_at) : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 ml-2">
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-medium text-gray-900">
                        <span className="hidden sm:inline">Purchase: </span>{formatCurrency(car.purchase_price, car.purchase_currency)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        <span className="hidden sm:inline">Total Cost: </span>{formatCurrency(
                          convertCurrency(car.purchase_price, car.purchase_currency, 'AED') + (car.total_expenses_aed || 0),
                          'AED'
                        )}
                      </p>
                    </div>
                    {car.sale_price && (
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          Sale: {formatCurrency(car.sale_price, car.sale_currency)}
                        </p>
                        {car.profit_aed !== null && (
                          <p className={`text-sm font-medium ${car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            Profit: {car.profit_aed >= 0 ? '+' : ''}{formatCurrency(car.profit_aed, 'AED')}
                          </p>
                        )}
                      </div>
                    )}
                    {!car.sale_price && car.profit_aed !== null && (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {car.profit_aed >= 0 ? '+' : ''}{formatCurrency(car.profit_aed, 'AED')}
                        </p>
                        {car.days_to_sell && (
                          <p className="text-xs text-gray-500">
                            {car.days_to_sell} days
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {filteredCars.length === 0 && (
            <div className="text-center py-12">
              <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No cars found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first vehicle.
              </p>
            </div>
          )}
        </div>

      {/* Add Car Modal */}
      <AddCarModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCarAdded={fetchCars}
      />

      {/* Car Detail Modal */}
      <CarDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedCarId(null)
        }}
        carId={selectedCarId}
        onCarUpdated={() => {
          fetchCars()
          onDataUpdate?.()
        }}
      />

      {/* Analytics Modal */}
      <AnalyticsModal
        isOpen={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
      />
    </div>
  )
}
