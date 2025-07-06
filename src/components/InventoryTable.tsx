'use client'

import React, { useState, useMemo } from 'react'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
import { useSwipe } from '@/hooks/useSwipe'
import { useImageOptimization, useReducedMotion } from '@/hooks/useMobileOptimization'
import { LazyImage } from './ui/LazyImage'
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableCell, 
  SortableHeader,
  TableHeaderCell
} from './ui/table'
import { 
  FilterContainer, 
  FilterSelect, 
  FilterRange, 
  SearchInput 
} from './ui/filters'
import {
  Edit,
  Eye,
  Trash2,
  Car as CarIcon,
  Image as ImageIcon
} from 'lucide-react'

interface InventoryTableProps {
  cars: CarProfitAnalysis[]
  onCarClick: (carId: string) => void
  onEditCar?: (carId: string) => void
  onDeleteCar?: (carId: string) => void
  loading?: boolean
}

interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

interface Filters {
  status: string
  make: string
  yearMin: string
  yearMax: string
  priceMin: string
  priceMax: string
}

export default function InventoryTable({
  cars,
  onCarClick,
  onEditCar,
  onDeleteCar,
  loading = false
}: InventoryTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    make: '',
    yearMin: '',
    yearMax: '',
    priceMin: '',
    priceMax: ''
  })

  const { getOptimalImageFormat, shouldLoadImages } = useImageOptimization()

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const makes = [...new Set(cars.map(car => car.make))].sort()
    const statuses = [
      { value: 'for_sale', label: 'For Sale' },
      { value: 'sold', label: 'Sold' },
      { value: 'in_transit', label: 'In Transit' },
      { value: 'reserved', label: 'Reserved' }
    ]

    return { makes, statuses }
  }, [cars])

  // Filter and sort cars
  const filteredAndSortedCars = useMemo(() => {
    let filtered = cars.filter(car => {
      // Search filter
      const searchMatch = !debouncedSearchTerm || 
        car.vin.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        car.make.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        car.model.toLowerCase().includes(debouncedSearchTerm.toLowerCase())

      // Status filter
      const statusMatch = !filters.status || car.status === filters.status

      // Make filter
      const makeMatch = !filters.make || car.make === filters.make

      // Year filter
      const yearMatch = (!filters.yearMin || car.year >= parseInt(filters.yearMin)) &&
                       (!filters.yearMax || car.year <= parseInt(filters.yearMax))

      // Price filter (using purchase price in AED)
      const purchasePriceAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
      const priceMatch = (!filters.priceMin || purchasePriceAED >= parseFloat(filters.priceMin)) &&
                        (!filters.priceMax || purchasePriceAED <= parseFloat(filters.priceMax))

      return searchMatch && statusMatch && makeMatch && yearMatch && priceMatch
    })

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof CarProfitAnalysis]
        let bValue: any = b[sortConfig.key as keyof CarProfitAnalysis]

        // Handle special sorting cases
        if (sortConfig.key === 'total_cost') {
          aValue = convertCurrency(a.purchase_price, a.purchase_currency, 'AED') + (a.total_expenses_aed || 0)
          bValue = convertCurrency(b.purchase_price, b.purchase_currency, 'AED') + (b.total_expenses_aed || 0)
        }

        if (aValue === null || aValue === undefined) aValue = ''
        if (bValue === null || bValue === undefined) bValue = ''

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase()
          bValue = bValue.toLowerCase()
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [cars, debouncedSearchTerm, filters, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return current.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null
      }
      return { key, direction: 'asc' }
    })
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      make: '',
      yearMin: '',
      yearMax: '',
      priceMin: '',
      priceMax: ''
    })
    setSearchTerm('')
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length + (debouncedSearchTerm ? 1 : 0)

  const calculateTotalCost = (car: CarProfitAnalysis) => {
    const purchasePriceAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    return purchasePriceAED + (car.total_expenses_aed || 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by VIN, make, or model..."
          className="w-full sm:w-80"
        />
        
        <FilterContainer
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          onClear={clearFilters}
          activeFiltersCount={activeFiltersCount}
        >
          <div className="grid grid-cols-2 gap-4">
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              options={filterOptions.statuses}
            />
            
            <FilterSelect
              label="Make"
              value={filters.make}
              onChange={(value) => setFilters(prev => ({ ...prev, make: value }))}
              options={filterOptions.makes.map(make => ({ value: make, label: make }))}
            />
            
            <FilterRange
              label="Year"
              minValue={filters.yearMin}
              maxValue={filters.yearMax}
              onMinChange={(value) => setFilters(prev => ({ ...prev, yearMin: value }))}
              onMaxChange={(value) => setFilters(prev => ({ ...prev, yearMax: value }))}
              placeholder={{ min: 'Min Year', max: 'Max Year' }}
            />
            
            <FilterRange
              label="Price (AED)"
              minValue={filters.priceMin}
              maxValue={filters.priceMax}
              onMinChange={(value) => setFilters(prev => ({ ...prev, priceMin: value }))}
              onMaxChange={(value) => setFilters(prev => ({ ...prev, priceMax: value }))}
              placeholder={{ min: 'Min Price', max: 'Max Price' }}
            />
          </div>
        </FilterContainer>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedCars.length} of {cars.length} vehicles
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block modern-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Photo</TableHeaderCell>
              <SortableHeader
                sortKey="make"
                currentSort={sortConfig}
                onSort={handleSort}
              >
                Vehicle
              </SortableHeader>
              <SortableHeader
                sortKey="year"
                currentSort={sortConfig}
                onSort={handleSort}
                align="center"
              >
                Year
              </SortableHeader>
              <SortableHeader
                sortKey="vin"
                currentSort={sortConfig}
                onSort={handleSort}
              >
                VIN
              </SortableHeader>
              <SortableHeader
                sortKey="status"
                currentSort={sortConfig}
                onSort={handleSort}
                align="center"
              >
                Status
              </SortableHeader>
              <SortableHeader
                sortKey="purchase_price"
                currentSort={sortConfig}
                onSort={handleSort}
                align="right"
              >
                Purchase
              </SortableHeader>
              <SortableHeader
                sortKey="total_cost"
                currentSort={sortConfig}
                onSort={handleSort}
                align="right"
              >
                Total Cost
              </SortableHeader>
              <SortableHeader
                sortKey="sale_price"
                currentSort={sortConfig}
                onSort={handleSort}
                align="right"
              >
                Sale Price
              </SortableHeader>
              <SortableHeader
                sortKey="profit_aed"
                currentSort={sortConfig}
                onSort={handleSort}
                align="right"
              >
                Profit
              </SortableHeader>
              <TableHeaderCell align="center">Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedCars.map((car) => (
              <TableRow
                key={car.id}
                onClick={() => onCarClick(car.id)}
                className="cursor-pointer"
              >
                <TableCell>
                  <div className="w-14 h-14 rounded-xl shadow-sm overflow-hidden">
                    {car.photo_url && shouldLoadImages ? (
                      <LazyImage
                        src={getOptimalImageFormat(car.photo_url)}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full"
                        fallbackIcon={<ImageIcon className="h-7 w-7 text-gray-500" />}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <ImageIcon className="h-7 w-7 text-gray-500" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <CarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-base">
                        {car.make} {car.model}
                      </div>
                      <div className="text-sm text-gray-500">
                        {car.year}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell align="center" className="font-semibold text-gray-700">
                  {car.year}
                </TableCell>
                <TableCell className="font-mono text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1">
                  {car.vin}
                </TableCell>
                <TableCell align="center">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getStatusColor(car.status)}`}>
                    {getStatusLabel(car.status)}
                  </span>
                </TableCell>
                <TableCell align="right" className="font-semibold text-gray-800">
                  {formatCurrency(car.purchase_price, car.purchase_currency)}
                </TableCell>
                <TableCell align="right" className="font-semibold text-gray-800">
                  {formatCurrency(calculateTotalCost(car), 'AED')}
                </TableCell>
                <TableCell align="right" className="font-semibold text-gray-800">
                  {car.sale_price ? formatCurrency(car.sale_price, car.sale_currency) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell align="right">
                  {car.profit_aed !== null ? (
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg font-semibold text-sm ${
                      car.profit_aed >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {formatCurrency(car.profit_aed, 'AED')}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCarClick(car.id)
                      }}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded-lg transition-all duration-200 hover:scale-105"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {onEditCar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCar(car.id)
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    {onDeleteCar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteCar(car.id)
                        }}
                        className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-all duration-200 hover:scale-105"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3 sm:space-y-4">
        {filteredAndSortedCars.map((car) => (
          <MobileCarCard
            key={car.id}
            car={car}
            onCarClick={onCarClick}
            onEditCar={onEditCar}
            onDeleteCar={onDeleteCar}
          />
        ))}
      </div>
    </div>
  )
}

// Mobile Car Card Component with Swipe Support
function MobileCarCard({
  car,
  onCarClick,
  onEditCar,
  onDeleteCar
}: {
  car: CarProfitAnalysis
  onCarClick: (id: string) => void
  onEditCar?: (id: string) => void
  onDeleteCar?: (id: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const { getOptimalImageFormat, shouldLoadImages } = useImageOptimization()
  const { shouldReduceMotion, animationDuration } = useReducedMotion()

  const swipeRef = useSwipe({
    onSwipeLeft: () => setShowActions(true),
    onSwipeRight: () => setShowActions(false)
  }, { threshold: 50 })

  const calculateTotalCost = (car: CarProfitAnalysis): number => {
    const purchaseInAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    const expensesInAED = car.total_expenses || 0
    return purchaseInAED + expensesInAED
  }

  return (
    <div
      ref={swipeRef}
      className={`modern-card touch-card relative overflow-hidden ${
        shouldReduceMotion ? '' : 'transition-all'
      } ${showActions ? 'transform -translate-x-20' : ''}`}
      style={{
        transitionDuration: shouldReduceMotion ? '0ms' : `${animationDuration}ms`
      }}
      onClick={() => onCarClick(car.id)}
    >
      {/* Swipe Actions */}
      {showActions && (
        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-red-500 to-red-400 flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDeleteCar?.(car.id)
              setShowActions(false)
            }}
            className="text-white p-2 rounded-full hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex-shrink-0 overflow-hidden">
                  {car.photo_url && shouldLoadImages ? (
                    <LazyImage
                      src={getOptimalImageFormat(car.photo_url)}
                      alt={`${car.make} ${car.model}`}
                      className="w-full h-full"
                      fallbackIcon={<ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <CarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {car.year} {car.make} {car.model}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded truncate">{car.vin}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${getStatusColor(car.status)}`}>
                {getStatusLabel(car.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Purchase</span>
                <div className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{formatCurrency(car.purchase_price, car.purchase_currency)}</div>
              </div>
              <div className="bg-gray-50 p-2 sm:p-3 rounded-lg">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Cost</span>
                <div className="font-semibold text-gray-800 mt-1 text-sm sm:text-base">{formatCurrency(calculateTotalCost(car), 'AED')}</div>
              </div>
              {car.sale_price && (
                <>
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg">
                    <span className="text-xs text-blue-600 uppercase tracking-wide font-medium">Sale Price</span>
                    <div className="font-semibold text-blue-800 mt-1 text-sm sm:text-base">{formatCurrency(car.sale_price, car.sale_currency)}</div>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg ${car.profit_aed && car.profit_aed >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <span className={`text-xs uppercase tracking-wide font-medium ${car.profit_aed && car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>Profit</span>
                    <div className={`font-semibold mt-1 text-sm sm:text-base ${car.profit_aed && car.profit_aed >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {car.profit_aed !== null ? formatCurrency(car.profit_aed, 'AED') : '—'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCarClick(car.id)
                }}
                className="flex items-center justify-center space-x-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-medium touch-manipulation py-2.5 px-4 rounded-lg transition-all duration-200"
              >
                <Eye className="h-4 w-4" />
                <span>View</span>
              </button>
              {onEditCar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEditCar(car.id)
                  }}
                  className="flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium touch-manipulation py-2.5 px-4 rounded-lg transition-all duration-200"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

      {/* Empty State */}
      {filteredAndSortedCars.length === 0 && (
        <div className="modern-card text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CarIcon className="h-10 w-10 text-indigo-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No vehicles found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {activeFiltersCount > 0
              ? 'Try adjusting your search or filter criteria to find the vehicles you\'re looking for.'
              : 'Get started by adding your first vehicle to the inventory.'}
          </p>
        </div>
      )}
    </div>
  )
}
