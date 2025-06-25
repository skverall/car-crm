'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, ExpenseCategory, CurrencyType } from '@/lib/types/database'
import { getAllCurrencies } from '@/lib/utils/currency'
import { getCategoryLabel } from '@/lib/utils'
import { X } from 'lucide-react'

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
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchCars()
    }
  }, [isOpen])

  const fetchCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('id, vin, make, model, year, status')
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
      const expenseData = {
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

      // Reset form and close modal
      setFormData({
        expenseType: 'car',
        car_id: '',
        category: 'other',
        description: '',
        amount: '',
        currency: 'AED',
        expense_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Expense</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Expense Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Expense Type *</label>
            <select
              name="expenseType"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.expenseType}
              onChange={handleInputChange}
            >
              <option value="car">Car Expense</option>
              <option value="general">General Expense</option>
            </select>
          </div>

          {/* Car Selection (only for car expenses) */}
          {formData.expenseType === 'car' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Vehicle *</label>
              <select
                name="car_id"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700">Category *</label>
            <select
              name="category"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Description *</label>
            <input
              type="text"
              name="description"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="e.g., Engine repair, Shipping cost, Office rent"
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Amount *</label>
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency *</label>
              <select
                name="currency"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.currency}
                onChange={handleInputChange}
              >
                {getAllCurrencies().map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Expense Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Expense Date *</label>
            <input
              type="date"
              name="expense_date"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.expense_date}
              onChange={handleInputChange}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes about this expense..."
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
