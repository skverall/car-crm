'use client'

import React, { useState, useMemo } from 'react'
import { CarProfitAnalysis } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel } from '@/lib/utils'
import { 
  Car as CarIcon, 
  Eye, 
  Edit, 
  Trash2,
  Image as ImageIcon
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { Button } from '@/components/ui/button'
import { SortableTableHeader, SortDirection } from '@/components/ui/sortable-table-header'
import { TableFilters } from '@/components/ui/table-filters'
import { TablePagination } from '@/components/ui/table-pagination'
import { TableSkeleton } from '@/components/ui/table-skeleton'

interface CarInventoryTableProps {
  cars: CarProfitAnalysis[]
  loading: boolean
  onCarClick: (carId: string) => void
  onEditCar?: (carId: string) => void
  onDeleteCar?: (carId: string) => void
}

type SortKey = 'make_model' | 'year' | 'vin' | 'status' | 'purchase_price' | 'total_cost' | 'sale_price' | 'profit' | 'purchase_date'

export default function CarInventoryTable({
  cars,
  loading,
  onCarClick,
  onEditCar,
  onDeleteCar
}: CarInventoryTableProps) {
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [makeFilter, setMakeFilter] = useState('all')
  const [yearFromFilter, setYearFromFilter] = useState('')
  const [yearToFilter, setYearToFilter] = useState('')
  const [priceFromFilter, setPriceFromFilter] = useState('')
  const [priceToFilter, setPriceToFilter] = useState('')
  
  // State for sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'purchase_date',
    direction: 'desc'
  })
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Get unique makes for filter dropdown
  const uniqueMakes = useMemo(() => {
    const makes = [...new Set(cars.map(car => car.make))].sort()
    return [{ value: 'all', label: 'All Makes' }, ...makes.map(make => ({ value: make, label: make }))]
  }, [cars])

  // Filter cars based on current filters
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      // Search filter
      const searchMatch = !searchTerm || 
        car.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        car.model.toLowerCase().includes(searchTerm.toLowerCase())

      // Status filter
      const statusMatch = statusFilter === 'all' || car.status === statusFilter

      // Make filter
      const makeMatch = makeFilter === 'all' || car.make === makeFilter

      // Year filter
      const yearMatch = (!yearFromFilter || car.year >= parseInt(yearFromFilter)) &&
                       (!yearToFilter || car.year <= parseInt(yearToFilter))

      // Price filter (using purchase price in AED)
      const purchasePriceAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
      const priceMatch = (!priceFromFilter || purchasePriceAED >= parseFloat(priceFromFilter)) &&
                        (!priceToFilter || purchasePriceAED <= parseFloat(priceToFilter))

      return searchMatch && statusMatch && makeMatch && yearMatch && priceMatch
    })
  }, [cars, searchTerm, statusFilter, makeFilter, yearFromFilter, yearToFilter, priceFromFilter, priceToFilter])

  // Sort cars
  const sortedCars = useMemo(() => {
    if (!sortConfig.direction) return filteredCars

    return [...filteredCars].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortConfig.key) {
        case 'make_model':
          aValue = `${a.make} ${a.model}`
          bValue = `${b.make} ${b.model}`
          break
        case 'year':
          aValue = a.year
          bValue = b.year
          break
        case 'vin':
          aValue = a.vin
          bValue = b.vin
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'purchase_price':
          aValue = convertCurrency(a.purchase_price, a.purchase_currency, 'AED')
          bValue = convertCurrency(b.purchase_price, b.purchase_currency, 'AED')
          break
        case 'total_cost':
          aValue = convertCurrency(a.purchase_price, a.purchase_currency, 'AED') + a.total_expenses_aed
          bValue = convertCurrency(b.purchase_price, b.purchase_currency, 'AED') + b.total_expenses_aed
          break
        case 'sale_price':
          aValue = a.sale_price ? convertCurrency(a.sale_price, a.sale_currency || 'AED', 'AED') : 0
          bValue = b.sale_price ? convertCurrency(b.sale_price, b.sale_currency || 'AED', 'AED') : 0
          break
        case 'profit':
          aValue = a.profit_aed || 0
          bValue = b.profit_aed || 0
          break
        case 'purchase_date':
          aValue = new Date(a.purchase_date)
          bValue = new Date(b.purchase_date)
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCars, sortConfig])

  // Paginate cars
  const totalPages = Math.ceil(sortedCars.length / pageSize)
  const paginatedCars = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return sortedCars.slice(startIndex, startIndex + pageSize)
  }, [sortedCars, currentPage, pageSize])

  // Handle sorting
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 
                prev.key === key && prev.direction === 'desc' ? null : 'asc'
    }))
  }

  // Handle filter clearing
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setMakeFilter('all')
    setYearFromFilter('')
    setYearToFilter('')
    setPriceFromFilter('')
    setPriceToFilter('')
    setCurrentPage(1)
  }

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1)
  }

  // Reset current page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, makeFilter, yearFromFilter, yearToFilter, priceFromFilter, priceToFilter])

  // Calculate total cost (purchase price + expenses)
  const calculateTotalCost = (car: CarProfitAnalysis) => {
    const purchasePriceAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    return purchasePriceAED + car.total_expenses_aed
  }

  // Get profit color class
  const getProfitColorClass = (profit: number | null | undefined) => {
    if (!profit) return 'text-gray-500'
    if (profit > 0) return 'text-green-600 font-semibold'
    if (profit < 0) return 'text-red-600 font-semibold'
    return 'text-gray-500'
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
        <TableSkeleton rows={10} columns={10} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <TableFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by VIN, make, or model..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'in_transit', label: 'In Transit' },
              { value: 'for_sale', label: 'For Sale' },
              { value: 'sold', label: 'Sold' },
              { value: 'reserved', label: 'Reserved' }
            ],
            onChange: setStatusFilter
          },
          {
            key: 'make',
            label: 'Make',
            value: makeFilter,
            options: uniqueMakes,
            onChange: setMakeFilter
          }
        ]}
        onClearFilters={handleClearFilters}
      />

      {/* Additional filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Year From</label>
          <input
            type="number"
            placeholder="e.g. 2020"
            value={yearFromFilter}
            onChange={(e) => setYearFromFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Year To</label>
          <input
            type="number"
            placeholder="e.g. 2024"
            value={yearToFilter}
            onChange={(e) => setYearToFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Min Price (AED)</label>
          <input
            type="number"
            placeholder="e.g. 50000"
            value={priceFromFilter}
            onChange={(e) => setPriceFromFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Price (AED)</label>
          <input
            type="number"
            placeholder="e.g. 200000"
            value={priceToFilter}
            onChange={(e) => setPriceToFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Photo</TableHead>
              <SortableTableHeader
                sortKey="make_model"
                currentSort={sortConfig}
                onSort={handleSort}
                className="min-w-[200px]"
              >
                Make/Model
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="year"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-20"
              >
                Year
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="vin"
                currentSort={sortConfig}
                onSort={handleSort}
                className="min-w-[150px]"
              >
                VIN
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="status"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Status
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="purchase_price"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Purchase Price
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="total_cost"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Total Cost
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="sale_price"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Sale Price
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="profit"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Profit
              </SortableTableHeader>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <CarIcon className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No vehicles found</p>
                    <p className="text-sm text-gray-400">
                      {searchTerm || statusFilter !== 'all' || makeFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria.'
                        : 'Get started by adding your first vehicle.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCars.map((car) => {
                const totalCost = calculateTotalCost(car)
                const salePriceAED = car.sale_price ? convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED') : null

                return (
                  <TableRow
                    key={car.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onCarClick(car.id)}
                  >
                    <TableCell>
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{car.make} {car.model}</div>
                    </TableCell>
                    <TableCell>{car.year}</TableCell>
                    <TableCell className="font-mono text-sm">{car.vin}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                        {getStatusLabel(car.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(car.purchase_price, car.purchase_currency)}</TableCell>
                    <TableCell>{formatCurrency(totalCost, 'AED')}</TableCell>
                    <TableCell>
                      {car.status === 'sold' && salePriceAED ? formatCurrency(salePriceAED, 'AED') : '-'}
                    </TableCell>
                    <TableCell>
                      {car.status === 'sold' && car.profit_aed !== null ? (
                        <span className={getProfitColorClass(car.profit_aed)}>
                          {formatCurrency(car.profit_aed, 'AED')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCarClick(car.id)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onEditCar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditCar(car.id)
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDeleteCar && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteCar(car.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Tablet Table View (simplified) */}
      <div className="hidden md:block lg:hidden border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHeader
                sortKey="make_model"
                currentSort={sortConfig}
                onSort={handleSort}
                className="min-w-[180px]"
              >
                Vehicle
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="vin"
                currentSort={sortConfig}
                onSort={handleSort}
                className="min-w-[120px]"
              >
                VIN
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="status"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-24"
              >
                Status
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="purchase_price"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-32"
              >
                Price
              </SortableTableHeader>
              <SortableTableHeader
                sortKey="profit"
                currentSort={sortConfig}
                onSort={handleSort}
                className="w-24"
              >
                Profit
              </SortableTableHeader>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCars.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <CarIcon className="h-12 w-12 text-gray-400" />
                    <p className="text-gray-500">No vehicles found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCars.map((car) => {
                const totalCost = calculateTotalCost(car)

                return (
                  <TableRow
                    key={car.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => onCarClick(car.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="font-medium">{car.make} {car.model}</div>
                        <div className="text-sm text-gray-500">{car.year}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{car.vin.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                        {getStatusLabel(car.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatCurrency(car.purchase_price, car.purchase_currency)}</div>
                        <div className="text-gray-500">Total: {formatCurrency(totalCost, 'AED')}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {car.status === 'sold' && car.profit_aed !== null ? (
                        <span className={getProfitColorClass(car.profit_aed)}>
                          {formatCurrency(car.profit_aed, 'AED')}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCarClick(car.id)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedCars.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center space-y-2">
              <CarIcon className="h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No vehicles found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== 'all' || makeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first vehicle.'}
              </p>
            </div>
          </div>
        ) : (
          paginatedCars.map((car) => {
            const totalCost = calculateTotalCost(car)
            const salePriceAED = car.sale_price ? convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED') : null

            return (
              <div
                key={car.id}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer touch-manipulation"
                onClick={() => onCarClick(car.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate">
                        {car.year} {car.make} {car.model}
                      </h3>
                      <p className="text-sm text-gray-500 font-mono">{car.vin}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                    {getStatusLabel(car.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Purchase Price</p>
                    <p className="font-medium">{formatCurrency(car.purchase_price, car.purchase_currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Cost</p>
                    <p className="font-medium">{formatCurrency(totalCost, 'AED')}</p>
                  </div>
                  {car.status === 'sold' && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Sale Price</p>
                        <p className="font-medium">
                          {salePriceAED ? formatCurrency(salePriceAED, 'AED') : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Profit</p>
                        <p className={`font-medium ${getProfitColorClass(car.profit_aed)}`}>
                          {car.profit_aed !== null ? formatCurrency(car.profit_aed, 'AED') : '-'}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCarClick(car.id)
                      }}
                      className="touch-manipulation"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {onEditCar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditCar(car.id)
                        }}
                        className="touch-manipulation"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {onDeleteCar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteCar(car.id)
                      }}
                      className="text-red-500 hover:text-red-700 touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={sortedCars.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}
    </div>
  )
}
