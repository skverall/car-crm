'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import {
  Car as CarIcon,
  Plus
} from 'lucide-react'
import AddCarModal from './AddCarModal'
import CarDetailModal from './CarDetailModal'
import InventoryTable from './InventoryTable'

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
        <div className="modern-card p-8 flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Vehicle Inventory</h1>
          <p className="text-gray-600 text-lg">Manage your vehicle inventory and track status</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-6 py-3 rounded-xl flex items-center font-medium"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <CarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCars}</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">In Transit</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inTransit}</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">For Sale</p>
              <p className="text-2xl font-bold text-gray-800">{stats.forSale}</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Reserved</p>
              <p className="text-2xl font-bold text-gray-800">{stats.reserved}</p>
            </div>
          </div>
        </div>

        <div className="metric-card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-r from-gray-400 to-gray-600 rounded-xl flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600 mb-1">Sold</p>
              <p className="text-2xl font-bold text-gray-800">{stats.sold}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <InventoryTable
        cars={cars}
        onCarClick={handleCarClick}
        loading={loading}
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
