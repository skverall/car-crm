'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MarketPrice } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/currency'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Calendar, DollarSign, X } from 'lucide-react'

interface MarketPriceTrendChartProps {
  onClose: () => void
}

interface ChartDataPoint {
  date: string
  price: number
  formattedDate: string
  source?: string
}

export default function MarketPriceTrendChart({ onClose }: MarketPriceTrendChartProps) {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([])
  const [selectedMake, setSelectedMake] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMarketPrices()
  }, [])

  useEffect(() => {
    if (selectedMake && selectedModel && selectedYear) {
      generateChartData()
    } else {
      setChartData([])
    }
  }, [selectedMake, selectedModel, selectedYear, marketPrices])

  const fetchMarketPrices = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('date_updated', { ascending: true })

      if (error) {
        console.error('Error fetching market prices:', error)
        return
      }

      setMarketPrices(data || [])
    } catch (error) {
      console.error('Error fetching market prices:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = () => {
    const filteredPrices = marketPrices.filter(price => 
      price.make === selectedMake && 
      price.model === selectedModel && 
      price.year.toString() === selectedYear
    )

    const chartPoints: ChartDataPoint[] = filteredPrices.map(price => ({
      date: price.date_updated,
      price: price.market_price,
      formattedDate: new Date(price.date_updated).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      source: price.source || 'Unknown'
    }))

    setChartData(chartPoints)
  }

  // Get unique makes, models, and years for dropdowns
  const uniqueMakes = Array.from(new Set(marketPrices.map(price => price.make))).sort()
  const uniqueModels = selectedMake 
    ? Array.from(new Set(marketPrices.filter(price => price.make === selectedMake).map(price => price.model))).sort()
    : []
  const uniqueYears = selectedMake && selectedModel
    ? Array.from(new Set(marketPrices.filter(price => price.make === selectedMake && price.model === selectedModel).map(price => price.year.toString()))).sort()
    : []

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.formattedDate}</p>
          <p className="text-blue-600">
            Price: {formatCurrency(data.price, 'AED')}
          </p>
          {data.source && (
            <p className="text-gray-500 text-sm">Source: {data.source}</p>
          )}
        </div>
      )
    }
    return null
  }

  const getStatistics = () => {
    if (chartData.length === 0) return null

    const prices = chartData.map(d => d.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const latestPrice = chartData[chartData.length - 1]?.price || 0
    const firstPrice = chartData[0]?.price || 0
    const priceChange = latestPrice - firstPrice
    const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0

    return {
      minPrice,
      maxPrice,
      avgPrice,
      latestPrice,
      priceChange,
      priceChangePercent
    }
  }

  const stats = getStatistics()

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-xl font-medium text-gray-900">Market Price Trends</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Vehicle Selection */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Select Vehicle</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Make</label>
              <select
                value={selectedMake}
                onChange={(e) => {
                  setSelectedMake(e.target.value)
                  setSelectedModel('')
                  setSelectedYear('')
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Make</option>
                {uniqueMakes.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Model</label>
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value)
                  setSelectedYear('')
                }}
                disabled={!selectedMake}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Model</option>
                {uniqueModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!selectedModel}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select Year</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && chartData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-xs text-blue-600 font-medium">Latest Price</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {formatCurrency(stats.latestPrice, 'AED')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Max Price</p>
                  <p className="text-sm font-semibold text-green-900">
                    {formatCurrency(stats.maxPrice, 'AED')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Min Price</p>
                  <p className="text-sm font-semibold text-yellow-900">
                    {formatCurrency(stats.minPrice, 'AED')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
                <div>
                  <p className="text-xs text-purple-600 font-medium">Avg Price</p>
                  <p className="text-sm font-semibold text-purple-900">
                    {formatCurrency(stats.avgPrice, 'AED')}
                  </p>
                </div>
              </div>
            </div>

            <div className={`rounded-lg p-3 ${stats.priceChangePercent >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center">
                <TrendingUp className={`h-5 w-5 mr-2 ${stats.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <p className={`text-xs font-medium ${stats.priceChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Price Change
                  </p>
                  <p className={`text-sm font-semibold ${stats.priceChangePercent >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                    {stats.priceChangePercent >= 0 ? '+' : ''}{stats.priceChangePercent.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Calendar className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">
                {!selectedMake || !selectedModel || !selectedYear 
                  ? 'Please select a vehicle to view price trends'
                  : 'No price data found for the selected vehicle'
                }
              </p>
            </div>
          ) : (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Price Trend for {selectedMake} {selectedModel} {selectedYear}
              </h4>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="formattedDate" 
                      stroke="#666"
                      fontSize={12}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke="#666"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 text-sm text-gray-600">
                <p>Data points: {chartData.length} | Date range: {chartData[0]?.formattedDate} - {chartData[chartData.length - 1]?.formattedDate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
