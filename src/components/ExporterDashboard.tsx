'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { 
  Car as CarIcon, 
  TrendingUp, 
  Package, 
  Ship,
  DollarSign,
  Calendar,
  MapPin,
  BarChart3
} from 'lucide-react'
import CarDetailModal from './CarDetailModal'

interface ExporterDashboardProps {
  onDataUpdate?: () => void
}

export default function ExporterDashboard({ onDataUpdate }: ExporterDashboardProps) {
  const [cars, setCars] = useState<CarProfitAnalysis[]>([])
  const [loading, setLoading] = useState(true)
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

  // Exporter-specific metrics
  const totalInventoryValue = cars
    .filter(car => car.status !== 'sold')
    .reduce((total, car) => {
      const purchasePrice = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
      const expenses = car.total_expenses_aed || 0
      return total + purchasePrice + expenses
    }, 0)

  const readyForExport = cars.filter(car => car.status === 'for_sale').length
  const inTransit = cars.filter(car => car.status === 'in_transit').length
  const totalVehicles = cars.length
  const soldVehicles = cars.filter(car => car.status === 'sold').length

  const averageTimeToExport = cars
    .filter(car => car.status === 'sold' && car.days_to_sell)
    .reduce((sum, car) => sum + (car.days_to_sell || 0), 0) / 
    Math.max(1, cars.filter(car => car.status === 'sold' && car.days_to_sell).length)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export Dashboard</h1>
        <p className="text-gray-600">Monitor your vehicle export operations</p>
      </div>

      {/* Export Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ready for Export</dt>
                  <dd className="text-lg font-medium text-gray-900">{readyForExport}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Ship className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Transit</dt>
                  <dd className="text-lg font-medium text-gray-900">{inTransit}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Inventory Value</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalInventoryValue, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg. Export Time</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {averageTimeToExport > 0 ? `${Math.round(averageTimeToExport)} days` : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Status Overview */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Export Status Overview
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalVehicles}</div>
              <div className="text-sm text-gray-500">Total Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{inTransit}</div>
              <div className="text-sm text-gray-500">In Transit</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{readyForExport}</div>
              <div className="text-sm text-gray-500">Ready to Export</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{soldVehicles}</div>
              <div className="text-sm text-gray-500">Exported</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Vehicles */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Vehicles ({cars.slice(0, 10).length})
          </h3>
          <div className="space-y-3">
            {cars.slice(0, 10).map((car) => (
              <div
                key={car.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleCarClick(car.id)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <CarIcon className="h-6 w-6 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {car.year} {car.make} {car.model}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{car.vin}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(car.purchase_price, car.purchase_currency)}
                    </p>
                    <p className="text-xs text-gray-500">
                      + {formatCurrency(car.total_expenses_aed || 0, 'AED')} expenses
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                    {getStatusLabel(car.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {cars.length === 0 && (
            <div className="text-center py-8">
              <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by adding vehicles to your export inventory.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Car Detail Modal */}
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
