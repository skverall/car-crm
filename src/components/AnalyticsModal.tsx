'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/currency'

import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Calendar,
  BarChart3,

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

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  })
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchAnalyticsData()
    }
  }, [isOpen, dateRange, fetchAnalyticsData])

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('car_profit_analysis')
        .select('*')
        .gte('purchase_date', dateRange.startDate)
        .lte('purchase_date', dateRange.endDate)
        .order('purchase_date', { ascending: false })

      if (error) throw error
      setCars(data || [])
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  if (!isOpen) return null

  // Calculate analytics
  const soldCars = cars.filter(car => car.status === 'sold' && car.profit_aed !== null)
  const totalProfit = soldCars.reduce((sum, car) => sum + (car.profit_aed || 0), 0)
  // const totalRevenue = soldCars.reduce((sum, car) => sum + (car.sale_price || 0) *
  //   (car.sale_currency === 'AED' ? 1 :
  //    car.sale_currency === 'USD' ? 3.67 :
  //    car.sale_currency === 'EUR' ? 4.00 :
  //    car.sale_currency === 'GBP' ? 4.60 : 1), 0)
  
  const avgProfit = soldCars.length > 0 ? totalProfit / soldCars.length : 0
  const avgDaysToSell = soldCars.length > 0 ? 
    soldCars.reduce((sum, car) => sum + (car.days_to_sell || 0), 0) / soldCars.length : 0

  // Profit by month
  const monthlyData = soldCars.reduce((acc, car) => {
    if (!car.sale_date) return acc
    const month = new Date(car.sale_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    if (!acc[month]) {
      acc[month] = { month, profit: 0, count: 0 }
    }
    acc[month].profit += car.profit_aed || 0
    acc[month].count += 1
    return acc
  }, {} as Record<string, { month: string; profit: number; count: number }>)

  const chartData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  )

  // Status distribution
  const statusData = [
    { name: 'In Transit', value: cars.filter(car => car.status === 'in_transit').length, color: '#3B82F6' },
    { name: 'For Sale', value: cars.filter(car => car.status === 'for_sale').length, color: '#10B981' },
    { name: 'Sold', value: cars.filter(car => car.status === 'sold').length, color: '#6B7280' },
    { name: 'Reserved', value: cars.filter(car => car.status === 'reserved').length, color: '#F59E0B' }
  ].filter(item => item.value > 0)

  // Top profitable cars
  const topProfitableCars = soldCars
    .sort((a, b) => (b.profit_aed || 0) - (a.profit_aed || 0))
    .slice(0, 5)

  // Best selling models analysis
  const modelAnalysis = soldCars.reduce((acc, car) => {
    const modelKey = `${car.make} ${car.model}`
    if (!acc[modelKey]) {
      acc[modelKey] = {
        make: car.make,
        model: car.model,
        count: 0,
        totalProfit: 0,
        totalDaysToSell: 0,
        avgProfit: 0,
        avgDaysToSell: 0
      }
    }
    acc[modelKey].count += 1
    acc[modelKey].totalProfit += car.profit_aed || 0
    acc[modelKey].totalDaysToSell += car.days_to_sell || 0
    return acc
  }, {} as Record<string, {
    make: string
    model: string
    count: number
    totalProfit: number
    totalDaysToSell: number
    avgProfit: number
    avgDaysToSell: number
  }>)

  // Calculate averages and sort by count (best sellers)
  const bestSellingModels = Object.values(modelAnalysis)
    .map(model => ({
      ...model,
      avgProfit: model.count > 0 ? model.totalProfit / model.count : 0,
      avgDaysToSell: model.count > 0 ? model.totalDaysToSell / model.count : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white mb-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">Analytics & Reports</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="mt-1 block border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="mt-1 block border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Total Profit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalProfit, 'AED')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Avg Profit</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(avgProfit, 'AED')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Avg Days to Sell</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(avgDaysToSell)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <TrendingDown className="h-8 w-8 text-orange-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Cars Sold</p>
                    <p className="text-2xl font-bold text-gray-900">{soldCars.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Profit Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Monthly Profit Trend</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value, 'AED'), 'Profit']}
                    />
                    <Bar dataKey="profit" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Inventory Status</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip />
                    <RechartsPieChart data={statusData}>
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPieChart>
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Best Selling Models */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Best Selling Models</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Units Sold
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Profit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Days to Sell
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bestSellingModels.map((model) => (
                      <tr key={`${model.make}-${model.model}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {model.make} {model.model}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{model.count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${model.avgProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {model.avgProfit >= 0 ? '+' : ''}{formatCurrency(model.avgProfit, 'AED')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {Math.round(model.avgDaysToSell)} days
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${model.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {model.totalProfit >= 0 ? '+' : ''}{formatCurrency(model.totalProfit, 'AED')}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bestSellingModels.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No sold cars to analyze</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Profitable Cars */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Top Profitable Cars</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Car Expenses
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sale Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Days to Sell
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topProfitableCars.map((car) => (
                      <tr key={car.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {car.year} {car.make} {car.model}
                            </div>
                            <div className="text-sm text-gray-500">{car.vin}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(car.purchase_price, car.purchase_currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(car.total_expenses_aed || 0, 'AED')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {car.sale_price ? formatCurrency(car.sale_price, car.sale_currency) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            (car.profit_aed || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {car.profit_aed ? formatCurrency(car.profit_aed, 'AED') : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {car.days_to_sell || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {topProfitableCars.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No sold cars in the selected date range</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
