'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { 
  Car as CarIcon, 
  Plus,
  Search,
  Filter
} from 'lucide-react'
import AddCarModal from './AddCarModal'
import CarDetailModal from './CarDetailModal'

interface InventoryPageProps {
  onDataUpdate?: () => void
}

export default function InventoryPage({ onDataUpdate }: InventoryPageProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCars()
  }, [])

  const fetchCars = async () => {
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
  }

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

  const stats = {
    totalCars: cars.length,
    inTransit: cars.filter(car => car.status === 'in_transit').length,
    forSale: cars.filter(car => car.status === 'for_sale').length,
    sold: cars.filter(car => car.status === 'sold').length,
    reserved: cars.filter(car => car.status === 'reserved').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Inventory</h1>
          <p className="text-gray-600">Manage your vehicle inventory and track status</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">Total</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalCars}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">In Transit</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.inTransit}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">For Sale</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.forSale}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">Reserved</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.reserved}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              </div>
              <div className="ml-3 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-gray-500 truncate">Sold</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.sold}</dd>
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
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Cars Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredCars.map((car) => (
          <div
            key={car.id}
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow cursor-pointer touch-manipulation"
            onClick={() => handleCarClick(car.id)}
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center min-w-0 flex-1">
                  <CarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mr-2 sm:mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-lg font-medium text-gray-900 truncate" title={`${car.year} ${car.make} ${car.model}`}>
                      {car.year} {car.make} {car.model}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 font-mono truncate" title={car.vin}>{car.vin}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)} ml-2`}>
                  {getStatusLabel(car.status)}
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 block">Purchase Price</span>
                    <span className="font-medium text-gray-900">{formatCurrency(car.purchase_price, car.purchase_currency)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Total Cost</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(
                        convertCurrency(car.purchase_price, car.purchase_currency, 'AED') + (car.total_expenses_aed || 0),
                        'AED'
                      )}
                    </span>
                  </div>
                </div>

                {car.sale_price && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Sale Price</span>
                      <span className="font-medium text-gray-900">{formatCurrency(car.sale_price, car.sale_currency)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Profit/Loss</span>
                      <span className={`font-medium ${car.profit_aed && car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {car.profit_aed ? (car.profit_aed >= 0 ? '+' : '') + formatCurrency(car.profit_aed, 'AED') : '-'}
                      </span>
                    </div>
                  </div>
                )}

                {!car.sale_price && car.status === 'for_sale' && (
                  <div className="text-center pt-2">
                    <span className="text-sm text-blue-600 font-medium">Available for Sale</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredCars.length === 0 && (
        <div className="text-center py-12">
          <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'Get started by adding your first vehicle.'}
          </p>
        </div>
      )}

      {/* Modals */}
      <AddCarModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCarAdded={fetchCars}
      />

      <CarDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedCarId(null)
        }}
        carId={selectedCarId}
        onCarUpdated={fetchCars}
      />
    </div>
  )
}
