'use client'

import React, { useState, useMemo } from 'react'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { useDebounce } from '@/hooks/useDebounce'
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
      const purchasePriceAED = car.purchase_price * (
        car.purchase_currency === 'AED' ? 1 :
        car.purchase_currency === 'USD' ? 3.67 :
        car.purchase_currency === 'EUR' ? 4.00 :
        car.purchase_currency === 'GBP' ? 4.60 : 1
      )
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
          aValue = (a.purchase_price * (a.purchase_currency === 'AED' ? 1 : a.purchase_currency === 'USD' ? 3.67 : a.purchase_currency === 'EUR' ? 4.00 : 4.60)) + (a.total_expenses_aed || 0)
          bValue = (b.purchase_price * (b.purchase_currency === 'AED' ? 1 : b.purchase_currency === 'USD' ? 3.67 : b.purchase_currency === 'EUR' ? 4.00 : 4.60)) + (b.total_expenses_aed || 0)
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
    const purchasePriceAED = car.purchase_price * (
      car.purchase_currency === 'AED' ? 1 :
      car.purchase_currency === 'USD' ? 3.67 :
      car.purchase_currency === 'EUR' ? 4.00 :
      car.purchase_currency === 'GBP' ? 4.60 : 1
    )
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
      <div className="hidden lg:block bg-white shadow overflow-hidden sm:rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Photo</TableHeaderCell>
              <SortableHeader
                sortKey="make"
                currentSort={sortConfig}
                onSort={handleSort}
              >
                Make/Model
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
                Purchase Price
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
              <TableRow key={car.id}>
                <TableCell>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <CarIcon className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {car.make} {car.model}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell align="center" className="font-medium">
                  {car.year}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {car.vin}
                </TableCell>
                <TableCell align="center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                    {getStatusLabel(car.status)}
                  </span>
                </TableCell>
                <TableCell align="right" className="font-medium">
                  {formatCurrency(car.purchase_price, car.purchase_currency)}
                </TableCell>
                <TableCell align="right" className="font-medium">
                  {formatCurrency(calculateTotalCost(car), 'AED')}
                </TableCell>
                <TableCell align="right" className="font-medium">
                  {car.sale_price ? formatCurrency(car.sale_price, car.sale_currency) : '-'}
                </TableCell>
                <TableCell align="right">
                  {car.profit_aed !== null ? (
                    <span className={`font-medium ${car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(car.profit_aed, 'AED')}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell align="center">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCarClick(car.id)
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded touch-manipulation"
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
                        className="text-gray-600 hover:text-gray-800 p-1 rounded touch-manipulation"
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
                        className="text-red-600 hover:text-red-800 p-1 rounded touch-manipulation"
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
      <div className="lg:hidden space-y-4">
        {filteredAndSortedCars.map((car) => (
          <div
            key={car.id}
            className="bg-white shadow rounded-lg p-4 space-y-3 touch-manipulation"
            onClick={() => onCarClick(car.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <CarIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {car.year} {car.make} {car.model}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">{car.vin}</p>
                </div>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                {getStatusLabel(car.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Purchase:</span>
                <div className="font-medium">{formatCurrency(car.purchase_price, car.purchase_currency)}</div>
              </div>
              <div>
                <span className="text-gray-500">Total Cost:</span>
                <div className="font-medium">{formatCurrency(calculateTotalCost(car), 'AED')}</div>
              </div>
              {car.sale_price && (
                <>
                  <div>
                    <span className="text-gray-500">Sale Price:</span>
                    <div className="font-medium">{formatCurrency(car.sale_price, car.sale_currency)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Profit:</span>
                    <div className={`font-medium ${car.profit_aed && car.profit_aed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {car.profit_aed !== null ? formatCurrency(car.profit_aed, 'AED') : '-'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-gray-100">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCarClick(car.id)
                }}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm font-medium touch-manipulation py-2 px-3 rounded"
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
                  className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 text-sm font-medium touch-manipulation py-2 px-3 rounded"
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit</span>
                </button>
              )}
              {onDeleteCar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteCar(car.id)
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm font-medium touch-manipulation py-2 px-3 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredAndSortedCars.length === 0 && (
        <div className="text-center py-12">
          <CarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {activeFiltersCount > 0
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first vehicle.'}
          </p>
        </div>
      )}
    </div>
  )
}
