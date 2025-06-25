'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Expense, Document } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { getStatusColor, getStatusLabel, getCategoryLabel, formatDate } from '@/lib/utils'
import { 
  X, 
  Edit, 
  Plus, 
  FileText, 
  Upload,
  DollarSign,

  Car as CarIcon
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
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && carId) {
      fetchCarDetails()
    }
  }, [isOpen, carId])

  const fetchCarDetails = async () => {
    if (!carId) return
    
    setLoading(true)
    try {
      // Fetch car details
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select('*')
        .eq('id', carId)
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

  if (!isOpen || !carId) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white modal-content">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!car) return null

  const profit = calculateProfit()
  const totalExpenses = calculateTotalExpenses()

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white mb-10">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicle Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">VIN:</span>
                  <span className="font-medium">{car.vin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Make & Model:</span>
                  <span className="font-medium">{car.make} {car.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Year:</span>
                  <span className="font-medium">{car.year}</span>
                </div>
                {car.color && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Color:</span>
                    <span className="font-medium">{car.color}</span>
                  </div>
                )}
                {car.engine_size && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Engine:</span>
                    <span className="font-medium">{car.engine_size}</span>
                  </div>
                )}
                {car.fuel_type && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fuel Type:</span>
                    <span className="font-medium">{car.fuel_type}</span>
                  </div>
                )}
                {car.transmission && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transmission:</span>
                    <span className="font-medium">{car.transmission}</span>
                  </div>
                )}
                {car.mileage && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mileage:</span>
                    <span className="font-medium">{car.mileage.toLocaleString()} km</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Price:</span>
                  <span className="font-medium">
                    {formatCurrency(car.purchase_price, car.purchase_currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Expenses:</span>
                  <span className="font-medium">
                    {formatCurrency(totalExpenses, 'AED')}
                  </span>
                </div>
                {car.sale_price && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sale Price:</span>
                    <span className="font-medium">
                      {formatCurrency(car.sale_price, car.sale_currency || 'AED')}
                    </span>
                  </div>
                )}
                {profit !== null && (
                  <div className="flex justify-between border-t pt-3">
                    <span className="text-gray-500">Profit/Loss:</span>
                    <span className={`font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit >= 0 ? '+' : ''}{formatCurrency(profit, 'AED')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase & Sale Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Purchase Information</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Purchase Date:</span>
                  <span className="font-medium">{formatDate(car.purchase_date)}</span>
                </div>
                {car.purchase_location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Purchase Location:</span>
                    <span className="font-medium">{car.purchase_location}</span>
                  </div>
                )}
                {car.dealer && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Dealer/Supplier:</span>
                    <span className="font-medium">{car.dealer}</span>
                  </div>
                )}
                {car.sale_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sale Date:</span>
                    <span className="font-medium">{formatDate(car.sale_date)}</span>
                  </div>
                )}
                {car.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Location:</span>
                    <span className="font-medium">{car.location}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {car.notes && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Notes</h4>
                <p className="text-gray-700">{car.notes}</p>
              </div>
            )}
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
    </div>
  )
}
