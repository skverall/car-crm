'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MarketPrice } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  Calendar,
  Car,
  DollarSign,
  Edit,
  Trash2,
  BarChart3
} from 'lucide-react'
import AddMarketPriceModal from './AddMarketPriceModal'
import MarketPriceTrendChart from './MarketPriceTrendChart'

interface MarketPricesPageProps {
  onDataUpdate?: () => void
}

export default function MarketPricesPage({ onDataUpdate }: MarketPricesPageProps) {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [makeFilter, setMakeFilter] = useState<string>('all')
  const [conditionFilter, setConditionFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTrendChart, setShowTrendChart] = useState(false)
  const [sortField, setSortField] = useState<keyof MarketPrice>('date_updated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const supabase = createClient()

  const fetchMarketPrices = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order(sortField, { ascending: sortDirection === 'asc' })

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
  }, [supabase, sortField, sortDirection])

  useEffect(() => {
    fetchMarketPrices()
  }, [fetchMarketPrices])

  const handleDataUpdate = () => {
    fetchMarketPrices()
    onDataUpdate?.()
  }

  const handleSort = (field: keyof MarketPrice) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this market price entry?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('market_prices')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting market price:', error)
        return
      }

      handleDataUpdate()
    } catch (error) {
      console.error('Error deleting market price:', error)
    }
  }

  // Filter and search logic
  const filteredPrices = marketPrices.filter(price => {
    const matchesSearch = searchTerm === '' || 
      price.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.source?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesMake = makeFilter === 'all' || price.make === makeFilter
    const matchesCondition = conditionFilter === 'all' || price.condition === conditionFilter

    return matchesSearch && matchesMake && matchesCondition
  })

  // Get unique makes for filter dropdown
  const uniqueMakes = Array.from(new Set(marketPrices.map(price => price.make))).sort()

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800'
      case 'good': return 'bg-blue-100 text-blue-800'
      case 'fair': return 'bg-yellow-100 text-yellow-800'
      case 'poor': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
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
          <h1 className="text-2xl font-bold text-gray-900">📊 Market Prices</h1>
          <p className="text-gray-600">Track and analyze vehicle market values</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowTrendChart(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Price Trends
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Price
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Car className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Entries</p>
              <p className="text-2xl font-semibold text-gray-900">{marketPrices.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Price</p>
              <p className="text-2xl font-semibold text-gray-900">
                {marketPrices.length > 0 
                  ? formatCurrency(marketPrices.reduce((sum, p) => sum + p.market_price, 0) / marketPrices.length, 'AED')
                  : formatCurrency(0, 'AED')
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Highest Price</p>
              <p className="text-2xl font-semibold text-gray-900">
                {marketPrices.length > 0 
                  ? formatCurrency(Math.max(...marketPrices.map(p => p.market_price)), 'AED')
                  : formatCurrency(0, 'AED')
                }
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Latest Update</p>
              <p className="text-2xl font-semibold text-gray-900">
                {marketPrices.length > 0 
                  ? formatDate(marketPrices.sort((a, b) => new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime())[0]?.date_updated)
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by make, model, or source..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Make Filter */}
          <select
            value={makeFilter}
            onChange={(e) => setMakeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Makes</option>
            {uniqueMakes.map(make => (
              <option key={make} value={make}>{make}</option>
            ))}
          </select>

          {/* Condition Filter */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Conditions</option>
            <option value="excellent">Excellent</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setMakeFilter('all')
              setConditionFilter('all')
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Market Prices Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('make')}
                >
                  Make/Model
                  {sortField === 'make' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('year')}
                >
                  Year
                  {sortField === 'year' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mileage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('market_price')}
                >
                  Market Price
                  {sortField === 'market_price' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date_updated')}
                >
                  Date Updated
                  {sortField === 'date_updated' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPrices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No market prices found</p>
                      <p className="text-sm">Add your first market price entry to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPrices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {price.make} {price.model}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.mileage ? `${price.mileage.toLocaleString()} km` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionBadgeColor(price.condition)}`}>
                        {price.condition.charAt(0).toUpperCase() + price.condition.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(price.market_price, price.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {price.source || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(price.date_updated)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDelete(price.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Market Price Modal */}
      {showAddModal && (
        <AddMarketPriceModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleDataUpdate}
        />
      )}

      {/* Market Price Trend Chart */}
      {showTrendChart && (
        <MarketPriceTrendChart
          onClose={() => setShowTrendChart(false)}
        />
      )}
    </div>
  )
}
