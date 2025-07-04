'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ExpenseCategory, CurrencyType } from '@/lib/types/database'
import { getAllCurrencies } from '@/lib/utils/currency'
import { getCategoryLabel } from '@/lib/utils'
import { X } from 'lucide-react'

interface AddExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  carId: string
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

export default function AddExpenseModal({ isOpen, onClose, carId, onExpenseAdded }: AddExpenseModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    category: 'other' as ExpenseCategory,
    description: '',
    amount: '',
    currency: 'AED' as CurrencyType,
    expense_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

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
        car_id: carId,
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
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-md border p-5">
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
              placeholder="e.g., Engine repair, Shipping cost"
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
    </div>
  )
}
