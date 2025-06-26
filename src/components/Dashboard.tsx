'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils'
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
}

export default function Dashboard({ onDataUpdate }: DashboardProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const supabase = createClient()

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
      console.error('Error fetching cars:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCars()
  }, [fetchCars])

  const handleCarClick = (carId: string) => {
    setSelectedCarId(carId)
    setShowDetailModal(true)
  }

  const filteredCars = cars.filter(car => {
    const matchesSearch = car.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         car.model.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || car.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Separate unsold cars for inventory calculations
  const unsoldCars = cars.filter(car => car.status !== 'sold')

  const stats = {
    totalCars: cars.length,
    unsoldCars: unsoldCars.length,
    inTransit: cars.filter(car => car.status === 'in_transit').length,
    forSale: cars.filter(car => car.status === 'for_sale').length,
    sold: cars.filter(car => car.status === 'sold').length,
    reserved: cars.filter(car => car.status === 'reserved').length,
    totalProfit: cars
      .filter(car => car.profit_aed !== null)
      .reduce((sum, car) => sum + (car.profit_aed || 0), 0),
    // Only count purchase cost for unsold cars (current inventory value)
    totalPurchaseCost: unsoldCars.reduce((sum, car) => {
      return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    }, 0),
    // Total cost including expenses for unsold cars
    totalInventoryValue: unsoldCars.reduce((sum, car) => {
      return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED') + (car.total_expenses_aed || 0)
    }, 0),
    totalSaleValue: cars
      .filter(car => car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Cash payments total
    cashPayments: cars
      .filter(car => car.status === 'sold' && car.payment_method === 'cash' && car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Bank/Card payments total
    bankPayments: cars
      .filter(car => car.status === 'sold' && car.payment_method === 'bank_card' && car.sale_price)
      .reduce((sum, car) => {
        return sum + convertCurrency(car.sale_price!, car.sale_currency || 'AED', 'AED')
      }, 0),
    // Stock Summary - total cost of unsold inventory
    stockValue: unsoldCars.reduce((sum, car) => {
      return sum + convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    }, 0),
    // Average days to sell for sold cars
    avgDaysToSell: cars
      .filter(car => car.status === 'sold' && car.days_to_sell)
      .reduce((sum, car, _, arr) => {
        return arr.length > 0 ? sum + (car.days_to_sell || 0) / arr.length : 0
      }, 0),
    // Monthly sales (cars sold this month)
    monthlySales: cars.filter(car => {
      if (!car.sale_date) return false
      const saleDate = new Date(car.sale_date)
      const now = new Date()
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
    }).length
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your vehicle inventory and business performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowAnalyticsModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Car
          </button>
        </div>
      </div>
        {/* Stats - First Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          {/* Cash Payments */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Banknote className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Cash</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {formatCurrency(stats.cashPayments, 'AED')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Cars Sold */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Cars Sold</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.sold}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Bank/Card Payments */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Bank</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {formatCurrency(stats.bankPayments, 'AED')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Reserved Cars */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Reserved Cars</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.reserved}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats - Second Row */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* Stock Summary */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Stock Summary</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {formatCurrency(stats.stockValue, 'AED')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Total Sales Revenue */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Sales Revenue</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {formatCurrency(stats.totalSaleValue, 'AED')}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Average Days to Sell */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Avg Days to Sell</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">
                      {Math.round(stats.avgDaysToSell)} days
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Sales */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-rose-500" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Monthly Sales</dt>
                    <dd className="text-base sm:text-lg font-medium text-gray-900">{stats.monthlySales}</dd>
                  </dl>
                </div>
              </div>
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
                    {stats.totalSaleValue > 0 ? Math.round((stats.totalProfit / stats.totalSaleValue) * 100) : 0}%
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
        </div>

        {/* Cars Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
            <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900">
              Vehicle Inventory ({filteredCars.length})
            </h3>
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
                      <CarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
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
