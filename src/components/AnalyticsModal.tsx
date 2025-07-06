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
  Download,
  Filter,
  RefreshCw,
  ZoomIn,
  Eye,
  FileText,
  PieChart,
  Activity
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
  AreaChart,
  Area,
  ComposedChart,
  Legend,
  Pie
} from 'recharts'

interface AnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'performance' | 'comparison'>('overview')
  const [selectedMetric, setSelectedMetric] = useState<'profit' | 'revenue' | 'expenses'>('profit')
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar')
  const [drillDownData, setDrillDownData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  })
  const supabase = createClient()

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true)
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

  useEffect(() => {
    if (isOpen) {
      fetchAnalyticsData()
    }
  }, [isOpen, dateRange, fetchAnalyticsData])

  const exportToCSV = () => {
    const csvData = [
      ['Analytics Report', `${dateRange.startDate} to ${dateRange.endDate}`],
      [''],
      ['Summary Metrics'],
      ['Total Profit', totalProfit.toFixed(2)],
      ['Average Profit', avgProfit.toFixed(2)],
      ['Average Days to Sell', avgDaysToSell.toFixed(0)],
      ['Cars Sold', soldCars.length.toString()],
      [''],
      ['Monthly Data'],
      ['Month', 'Profit', 'Cars Sold'],
      ...chartData.map(item => [item.month, item.profit.toFixed(2), item.count.toString()]),
      [''],
      ['Top Profitable Cars'],
      ['Vehicle', 'Purchase Price', 'Sale Price', 'Profit', 'Days to Sell'],
      ...topProfitableCars.map(car => [
        `${car.year} ${car.make} ${car.model}`,
        car.purchase_price?.toString() || '0',
        car.sale_price?.toString() || '0',
        car.profit_aed?.toString() || '0',
        car.days_to_sell?.toString() || '0'
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${dateRange.startDate}-${dateRange.endDate}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleChartClick = (data: any) => {
    setDrillDownData(data)
  }

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
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-6xl mb-10">
        <div className="modal-content p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800">Advanced Analytics</h3>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={exportToCSV}
              className="btn-primary px-4 py-2 rounded-lg flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={fetchAnalyticsData}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center text-sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-8 modern-card p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date Range Filter */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Date Range</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* View Selection */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">View</h4>
              <div className="space-y-2">
                {[
                  { id: 'overview', name: 'Overview', icon: Eye },
                  { id: 'trends', name: 'Trends', icon: TrendingUp },
                  { id: 'performance', name: 'Performance', icon: Activity },
                  { id: 'comparison', name: 'Comparison', icon: BarChart3 }
                ].map((view) => {
                  const Icon = view.icon
                  return (
                    <button
                      key={view.id}
                      onClick={() => setActiveView(view.id as any)}
                      className={`w-full flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeView === view.id
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {view.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Chart Controls */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Chart Options</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Metric</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="profit">Profit</option>
                    <option value="revenue">Revenue</option>
                    <option value="expenses">Expenses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Chart Type</label>
                  <div className="flex space-x-2">
                    {[
                      { id: 'bar', icon: BarChart3 },
                      { id: 'line', icon: TrendingUp },
                      { id: 'area', icon: Activity }
                    ].map((type) => {
                      const Icon = type.icon
                      return (
                        <button
                          key={type.id}
                          onClick={() => setChartType(type.id as any)}
                          className={`flex-1 flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            chartType === type.id
                              ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                              : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="metric-card p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Profit</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(totalProfit, 'AED')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="metric-card p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Avg Profit</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {formatCurrency(avgProfit, 'AED')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="metric-card p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Avg Days to Sell</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {Math.round(avgDaysToSell)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="metric-card p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">Cars Sold</p>
                    <p className="text-2xl font-bold text-gray-800">{soldCars.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Charts */}
            <div className="space-y-6">
              {/* Main Chart */}
              <div className="modern-card p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">
                    {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Trend
                  </h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setDrillDownData(null)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, 'AED'), selectedMetric]}
                      />
                      <Legend />
                      <Bar
                        dataKey={selectedMetric === 'profit' ? 'profit' : selectedMetric === 'revenue' ? 'profit' : 'count'}
                        fill="#3B82F6"
                        cursor="pointer"
                      />
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={chartData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, 'AED'), selectedMetric]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={selectedMetric === 'profit' ? 'profit' : selectedMetric === 'revenue' ? 'profit' : 'count'}
                        stroke="#3B82F6"
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
                      />
                    </LineChart>
                  ) : (
                    <AreaChart data={chartData} onClick={handleChartClick}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value, 'AED'), selectedMetric]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey={selectedMetric === 'profit' ? 'profit' : selectedMetric === 'revenue' ? 'profit' : 'count'}
                        stroke="#3B82F6"
                        fill="#3B82F6"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Secondary Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enhanced Status Distribution */}
                <div className="modern-card p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Inventory Status Distribution
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-3"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-800">{item.value}</span>
                          <span className="text-xs text-gray-500 ml-1">
                            ({((item.value / cars.length) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="modern-card p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Performance Metrics
                  </h4>
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Profit Margin</span>
                        <span className="text-lg font-bold text-green-600">
                          {totalProfit > 0 ? ((totalProfit / (totalProfit + 100000)) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-green-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((totalProfit / (totalProfit + 100000)) * 100), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-800">Sales Velocity</span>
                        <span className="text-lg font-bold text-blue-600">
                          {avgDaysToSell > 0 ? (30 / avgDaysToSell).toFixed(1) : '0.0'}/month
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((30 / avgDaysToSell) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-800">Success Rate</span>
                        <span className="text-lg font-bold text-purple-600">
                          {cars.length > 0 ? ((soldCars.length / cars.length) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-purple-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${cars.length > 0 ? (soldCars.length / cars.length) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Selling Models */}
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Best Selling Models</h4>
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
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Top Profitable Cars</h4>
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
    </div>
  )
}
