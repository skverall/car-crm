'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, ExpenseCategory, CurrencyType } from '@/lib/types/database'
import { getAllCurrencies } from '@/lib/utils/currency'
import { getCategoryLabel } from '@/lib/utils'
import {
  X,
  Upload,
  Calendar,
  Repeat,
  AlertCircle,
  CheckCircle,
  FileText,
  Camera,
  Paperclip
} from 'lucide-react'

interface AddExpenseModalAdvancedProps {
  isOpen: boolean
  onClose: () => void
  onExpenseAdded: () => void
}

const expenseCategories: ExpenseCategory[] = [
  'purchase',
  'transport',
  'customs',
  'repair',
  'maintenance',
  'marketing',
  'office',
  'other'
]

export default function AddExpenseModalAdvanced({ isOpen, onClose, onExpenseAdded }: AddExpenseModalAdvancedProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cars, setCars] = useState<Car[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState({
    expenseType: 'car' as 'car' | 'general',
    car_id: '',
    category: 'other' as ExpenseCategory,
    description: '',
    amount: '',
    currency: 'AED' as CurrencyType,
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
    isRecurring: false,
    recurringFrequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    recurringEndDate: '',
    requiresApproval: false,
    priority: 'medium' as 'low' | 'medium' | 'high',
    vendor: '',
    invoiceNumber: '',
    paymentMethod: 'cash' as 'cash' | 'bank_card' | 'bank_transfer' | 'check',
    tags: [] as string[]
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchCars()
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setFormData({
      expenseType: 'car',
      car_id: '',
      category: 'other',
      description: '',
      amount: '',
      currency: 'AED',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      recurringEndDate: '',
      requiresApproval: false,
      priority: 'medium',
      vendor: '',
      invoiceNumber: '',
      paymentMethod: 'cash',
      tags: []
    })
    setReceiptFile(null)
    setReceiptPreview(null)
    setError('')
  }

  const handleReceiptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Receipt file must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        setError('Receipt must be an image or PDF file')
        return
      }

      setReceiptFile(file)

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null)
      }
      setError('')
    }
  }

  const uploadReceipt = async (expenseId: string): Promise<string | null> => {
    if (!receiptFile) return null

    setUploadingReceipt(true)
    try {
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${expenseId}-${Date.now()}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, receiptFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading receipt:', error)
      return null
    } finally {
      setUploadingReceipt(false)
    }
  }

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
        .from('cars')
        .select('id, vin, make, model, year, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCars(data || [])
    } catch (error) {
      console.error('Error fetching cars:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to add an expense')
      }

      const expenseData = {
        user_id: user.id,
        car_id: formData.expenseType === 'car' ? formData.car_id : null,
        category: formData.category,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        expense_date: formData.expense_date,
        notes: formData.notes.trim() || null
      }

      const { error } = await supabase
        .from('expenses')
        .insert([expenseData])

      if (error) throw error

      // Upload receipt if provided
      let receiptUrl = null
      if (receiptFile) {
        receiptUrl = await uploadReceipt(expenseData.id || 'temp')
        if (receiptUrl) {
          // Update expense with receipt URL
          await supabase
            .from('expenses')
            .update({ receipt_url: receiptUrl })
            .eq('id', expenseData.id)
        }
      }

      resetForm()
      onExpenseAdded()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-4xl mb-10">
        <div className="modal-content p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Add New Expense</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Expense Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Type *</label>
                  <select
                    name="expenseType"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.expenseType}
                    onChange={handleInputChange}
                  >
                    <option value="car">Car Expense</option>
                    <option value="general">General Expense</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    name="priority"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Car Selection (only for car expenses) */}
                {formData.expenseType === 'car' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Vehicle *</label>
                    <select
                      name="car_id"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.car_id}
                      onChange={handleInputChange}
                    >
                      <option value="">Choose a vehicle...</option>
                      {cars.map(car => (
                        <option key={car.id} value={car.id}>
                          {car.year} {car.make} {car.model} - {car.vin}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                  <select
                    name="category"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {expenseCategories.map(category => (
                      <option key={category} value={category}>
                        {getCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor/Supplier</label>
                  <input
                    type="text"
                    name="vendor"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.vendor}
                    onChange={handleInputChange}
                    placeholder="Enter vendor name"
                  />
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <input
                    type="text"
                    name="description"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="e.g., Engine repair, Shipping cost, Office rent"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
                  <select
                    name="currency"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.currency}
                    onChange={handleInputChange}
                  >
                    {getAllCurrencies().map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expense Date *</label>
                  <input
                    type="date"
                    name="expense_date"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.expense_date}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    name="paymentMethod"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_card">Bank Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="check">Check</option>
                  </select>
                </div>

                {/* Invoice Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Invoice/Reference Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="Enter invoice or reference number"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Upload */}
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Paperclip className="h-5 w-5 mr-2" />
                Receipt & Documentation
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipt</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleReceiptUpload}
                      className="hidden"
                      id="receipt-upload"
                    />
                    <label htmlFor="receipt-upload" className="cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload receipt or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, PDF up to 5MB
                      </p>
                    </label>
                  </div>

                  {receiptPreview && (
                    <div className="mt-4">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-w-full h-32 object-contain border rounded-lg"
                      />
                    </div>
                  )}

                  {receiptFile && (
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      {receiptFile.name} ({(receiptFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="modern-card p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Additional Options
              </h4>

              <div className="space-y-4">
                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Additional notes about this expense..."
                  />
                </div>

                {/* Recurring Expense */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    id="isRecurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
                    This is a recurring expense
                  </label>
                </div>

                {formData.isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        name="recurringFrequency"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.recurringFrequency}
                        onChange={handleInputChange}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        name="recurringEndDate"
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.recurringEndDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}

                {/* Requires Approval */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="requiresApproval"
                    id="requiresApproval"
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-700">
                    This expense requires approval
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploadingReceipt}
                className="btn-primary px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
              >
                {loading || uploadingReceipt ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {uploadingReceipt ? 'Uploading...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add Expense
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
