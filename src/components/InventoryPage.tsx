'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import {
  Car as CarIcon,
  Plus
} from 'lucide-react'
import AddCarModal from './AddCarModal'
import CarDetailModal from './CarDetailModal'
import CarInventoryTable from './CarInventoryTable'

interface InventoryPageProps {
  onDataUpdate?: () => void
}

export default function InventoryPage({ onDataUpdate }: InventoryPageProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(true)

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

  // Stats are calculated from all cars, filtering is handled by the table component

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



      {/* Car Inventory Table */}
      <CarInventoryTable
        cars={cars}
        loading={loading}
        onCarClick={handleCarClick}
      />

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
