'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Expense, Document } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel, getCategoryLabel, formatDate, formatRelativeTime } from '@/lib/utils'
import {
  X,
  Edit,
  Plus,
  FileText,
  Upload,
  DollarSign,
  Trash2,
  Car as CarIcon,
  Receipt,
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Calendar,
  MapPin
} from 'lucide-react'
import AddExpenseModal from './AddExpenseModal'
import UploadDocumentModal from './UploadDocumentModal'
import EditCarModal from './EditCarModal'
import SaleModal from './SaleModal'

interface CarDetailModalProps {
  isOpen: boolean
  onClose: () => void
  carId: string | null
  onCarUpdated: () => void
}

export default function CarDetailModal({ isOpen, onClose, carId, onCarUpdated }: CarDetailModalProps) {
  const [car, setCar] = useState<Car | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'documents'>('overview')
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
  const [showUploadDocumentModal, setShowUploadDocumentModal] = useState(false)
  const [showEditCarModal, setShowEditCarModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  const fetchCarDetails = async () => {
    if (!carId) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        return
      }

      // Fetch car details (only if it belongs to current user)
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
        .eq('user_id', user.id)
        .single()

      if (carError) throw carError
      setCar(carData)

      // Fetch expenses
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('car_id', carId)
        .order('expense_date', { ascending: false })

      if (expensesError) throw expensesError
      setExpenses(expensesData || [])

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('car_id', carId)
        .order('uploaded_at', { ascending: false })

      if (documentsError) throw documentsError
      setDocuments(documentsData || [])

    } catch (error) {
      console.error('Error fetching car details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && carId) {
      fetchCarDetails()
    }
  }, [isOpen, carId])

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => {
      return total + convertCurrency(expense.amount, expense.currency, 'AED')
    }, 0)
  }

  const calculateProfit = () => {
    if (!car || !car.sale_price) return null

    const salePriceAED = convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED')
    const purchasePriceAED = convertCurrency(car.purchase_price, car.purchase_currency, 'AED')
    const totalExpensesAED = calculateTotalExpenses()

    return salePriceAED - purchasePriceAED - totalExpensesAED
  }

  const handleDeleteCar = async () => {
    if (!car) return

    setIsDeleting(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to delete a vehicle')
      }

      // Delete car (only if it belongs to current user)
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', car.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Close modal and refresh parent component
      onClose()
      onCarUpdated()
    } catch (error) {
      console.error('Error deleting car:', error)
      alert('Failed to delete car. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (!isOpen || !carId) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white shadow-lg rounded-md p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!car) return null

  const profit = calculateProfit()
  const totalExpenses = calculateTotalExpenses()

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50 flex flex-col min-h-screen">
      <div className="relative flex-1 full-screen-modal flex flex-col">
        <div className="w-full flex-1 bg-white p-6 flex flex-col">
          {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <CarIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{car.vin}</h3>
              <p className="text-lg text-gray-600">{car.year} {car.make} {car.model}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(car.status)}`}>
                {getStatusLabel(car.status)}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {car && car.status !== 'sold' && (
              <button
                onClick={() => setShowSaleModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center"
                title="Mark as sold"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Mark as Sold
              </button>
            )}
            <button
              onClick={() => setShowEditCarModal(true)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit vehicle"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-600"
              title="Delete vehicle"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: CarIcon },
              { id: 'expenses', name: 'Expenses', icon: DollarSign },
              { id: 'documents', name: 'Documents', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Purchase Price Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                    Purchase
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-600 font-medium">Purchase Price</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(car.purchase_price, car.purchase_currency)}
                  </p>
                  <p className="text-xs text-blue-500">{formatDate(car.purchase_date)}</p>
                </div>
              </div>

              {/* Total Expenses Card */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-orange-600 bg-orange-200 px-2 py-1 rounded-full">
                    Expenses
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-orange-600 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(totalExpenses, 'AED')}
                  </p>
                  <p className="text-xs text-orange-500">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Total Cost Card */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-purple-600 bg-purple-200 px-2 py-1 rounded-full">
                    Total Cost
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-purple-600 font-medium">Total Investment</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {formatCurrency(totalCost, 'AED')}
                  </p>
                  <p className="text-xs text-purple-500">Purchase + Expenses</p>
                </div>
              </div>

              {/* Profit/Sale Card */}
              {car.sale_price ? (
                <div className={`bg-gradient-to-br ${profit && profit >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'} rounded-xl p-6 border`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 ${profit && profit >= 0 ? 'bg-green-500' : 'bg-red-500'} rounded-lg flex items-center justify-center`}>
                      {profit && profit >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-white" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${profit && profit >= 0 ? 'text-green-600 bg-green-200' : 'text-red-600 bg-red-200'} px-2 py-1 rounded-full`}>
                      {profit && profit >= 0 ? 'Profit' : 'Loss'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className={`text-sm ${profit && profit >= 0 ? 'text-green-600' : 'text-red-600'} font-medium`}>
                      {profit && profit >= 0 ? 'Net Profit' : 'Net Loss'}
                    </p>
                    <p className={`text-2xl font-bold ${profit && profit >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                      {profit !== null && (
                        <>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit, 'AED')}
                        </>
                      )}
                    </p>
                    <p className={`text-xs ${profit && profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      Sale: {formatCurrency(car.sale_price, car.sale_currency || 'AED')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                      Available
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 font-medium">For Sale</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(totalCost * 1.2, 'AED')}
                    </p>
                    <p className="text-xs text-gray-500">Suggested price (+20%)</p>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Financial Analysis */}
            {car.sale_price && profit !== null && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                <h4 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-slate-600" />
                  Financial Analysis
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* ROI */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Return on Investment</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {profit >= 0 ? 'Profitable investment' : 'Loss on investment'}
                    </div>
                  </div>

                  {/* Profit Margin */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {car.sale_price > 0 ? ((profit / convertCurrency(car.sale_price, car.sale_currency || 'AED', 'AED')) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Profit Margin</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Profit as % of sale price
                    </div>
                  </div>

                  {/* Days to Sell */}
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900 mb-1">
                      {car.sale_date ? Math.ceil((new Date(car.sale_date).getTime() - new Date(car.purchase_date).getTime()) / (1000 * 60 * 60 * 24)) : '-'}
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Days to Sell</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {car.sale_date ? 'Purchase to sale' : 'Not sold yet'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Vehicle Information & Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Vehicle Specifications */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CarIcon className="h-5 w-5 mr-2 text-gray-600" />
                  Vehicle Specifications
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">VIN</span>
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{car.vin}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Make & Model</span>
                    <span className="font-semibold text-gray-900">{car.make} {car.model}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Year</span>
                    <span className="font-semibold text-gray-900">{car.year}</span>
                  </div>
                  {car.color && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Color</span>
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full border border-gray-300 mr-2" style={{backgroundColor: car.color.toLowerCase()}}></div>
                        <span className="font-medium text-gray-900 capitalize">{car.color}</span>
                      </div>
                    </div>
                  )}
                  {car.engine_size && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Engine</span>
                      <span className="font-medium text-gray-900">{car.engine_size}</span>
                    </div>
                  )}
                  {car.fuel_type && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Fuel Type</span>
                      <span className="font-medium text-gray-900 capitalize">{car.fuel_type}</span>
                    </div>
                  )}
                  {car.transmission && (
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">Transmission</span>
                      <span className="font-medium text-gray-900 capitalize">{car.transmission}</span>
                    </div>
                  )}
                  {car.mileage && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600 font-medium">Mileage</span>
                      <span className="font-medium text-gray-900">{car.mileage.toLocaleString()} km</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase & Transaction Information */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-600" />
                  Transaction History
                </h4>
                <div className="space-y-4">
                  {/* Purchase Information */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-blue-900">Purchase Transaction</h5>
                        <p className="text-sm text-blue-600">{formatDate(car.purchase_date)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-blue-600 font-medium">Amount:</span>
                        <p className="font-semibold text-blue-900">{formatCurrency(car.purchase_price, car.purchase_currency)}</p>
                      </div>
                      {car.purchase_location && (
                        <div>
                          <span className="text-blue-600 font-medium">Location:</span>
                          <p className="font-semibold text-blue-900">{car.purchase_location}</p>
                        </div>
                      )}
                      {car.dealer && (
                        <div className="md:col-span-2">
                          <span className="text-blue-600 font-medium">Dealer/Supplier:</span>
                          <p className="font-semibold text-blue-900">{car.dealer}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sale Information */}
                  {car.sale_date && car.sale_price ? (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-green-900">Sale Transaction</h5>
                          <p className="text-sm text-green-600">{formatDate(car.sale_date)}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-green-600 font-medium">Sale Price:</span>
                          <p className="font-semibold text-green-900">{formatCurrency(car.sale_price, car.sale_currency || 'AED')}</p>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Duration:</span>
                          <p className="font-semibold text-green-900">
                            {Math.ceil((new Date(car.sale_date).getTime() - new Date(car.purchase_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center mr-3">
                          <Target className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-amber-900">Available for Sale</h5>
                          <p className="text-sm text-amber-600">Ready to be sold</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-amber-600 font-medium">Suggested Price:</span>
                        <p className="font-semibold text-amber-900">{formatCurrency(totalCost * 1.2, 'AED')}</p>
                        <p className="text-xs text-amber-600 mt-1">Based on 20% markup over total cost</p>
                      </div>
                    </div>
                  )}

                  {/* Current Location */}
                  {car.location && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center mr-3">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <span className="text-gray-600 font-medium">Current Location:</span>
                          <p className="font-semibold text-gray-900">{car.location}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Expenses & Notes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Expenses */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Receipt className="h-5 w-5 mr-2 text-gray-600" />
                    Recent Expenses
                  </h4>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {expenses.length} total
                  </span>
                </div>
                {expenses.length > 0 ? (
                  <div className="space-y-3">
                    {expenses.slice(0, 3).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                            <DollarSign className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {getCategoryLabel(expense.category)}
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(expense.expense_date)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
                          {expense.description && (
                            <p className="text-xs text-gray-500 truncate max-w-20">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {expenses.length > 3 && (
                      <div className="text-center pt-2">
                        <button
                          onClick={() => setActiveTab('expenses')}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View all {expenses.length} expenses →
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No expenses recorded</p>
                    <button
                      onClick={() => setShowAddExpenseModal(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add first expense
                    </button>
                  </div>
                )}
              </div>

              {/* Notes & Additional Info */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-600" />
                  Notes & Information
                </h4>
                {car.notes ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-900 mb-2">Vehicle Notes</h5>
                      <p className="text-blue-800 text-sm leading-relaxed">{car.notes}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 text-sm">No notes added</p>
                    <button
                      onClick={() => setShowEditCarModal(true)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add notes
                    </button>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Quick Stats</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">{documents.length}</div>
                      <div className="text-gray-600">Documents</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="font-semibold text-gray-900">
                        {car.purchase_date ? Math.ceil((new Date().getTime() - new Date(car.purchase_date).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                      </div>
                      <div className="text-gray-600">Days Owned</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Expenses ({expenses.length})
              </h4>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <li key={expense.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <DollarSign className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {getCategoryLabel(expense.category)}
                          </p>
                          <p className="text-sm text-gray-500">{expense.description}</p>
                          <p className="text-xs text-gray-400">
                            {formatDate(expense.expense_date)}
                          </p>
                          <p className="text-xs text-gray-400">
                            Added {expense.created_at ? formatRelativeTime(expense.created_at) : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          ≈ {formatCurrency(convertCurrency(expense.amount, expense.currency, 'AED'), 'AED')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {expenses.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding an expense for this vehicle.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Documents ({documents.length})
              </h4>
              <button
                onClick={() => setShowUploadDocumentModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {documents.map((document) => (
                  <li key={document.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FileText className="h-5 w-5 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{document.name}</p>
                          <p className="text-sm text-gray-500">{document.type}</p>
                          <p className="text-xs text-gray-400">
                            Uploaded {formatDate(document.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-500 text-sm"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {documents.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload invoices, photos, and other documents for this vehicle.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {carId && (
        <AddExpenseModal
          isOpen={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          carId={carId}
          onExpenseAdded={fetchCarDetails}
        />
      )}

      {/* Upload Document Modal */}
      {carId && (
        <UploadDocumentModal
          isOpen={showUploadDocumentModal}
          onClose={() => setShowUploadDocumentModal(false)}
          carId={carId}
          onDocumentUploaded={fetchCarDetails}
        />
      )}

      {/* Edit Car Modal */}
      <EditCarModal
        isOpen={showEditCarModal}
        onClose={() => setShowEditCarModal(false)}
        car={car}
        onCarUpdated={fetchCarDetails}
      />

      {/* Sale Modal */}
      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        car={car}
        onSaleCompleted={() => {
          fetchCarDetails()
          onCarUpdated()
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Delete Vehicle
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this vehicle? This action will permanently remove:
                </p>
                <ul className="text-sm text-gray-500 mt-2 text-left">
                  <li>• Vehicle information ({car?.vin})</li>
                  <li>• All expenses ({expenses.length} items)</li>
                  <li>• All documents ({documents.length} items)</li>
                </ul>
                <p className="text-sm text-red-600 mt-2 font-medium">
                  This action cannot be undone.
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCar}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
