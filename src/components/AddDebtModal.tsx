'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, CurrencyType } from '@/lib/types/database'
import { getAllCurrencies } from '@/lib/utils/currency'
import { X } from 'lucide-react'

interface AddDebtModalProps {
  isOpen: boolean
  onClose: () => void
  onDebtAdded: () => void
}

export default function AddDebtModal({ isOpen, onClose, onDebtAdded }: AddDebtModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cars, setCars] = useState<Car[]>([])
  const supabase = createClient()

  const [formData, setFormData] = useState({
    car_id: '',
    creditor_name: '',
    description: '',
    amount: '',
    currency: 'AED' as CurrencyType,
    debt_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchCars()
    }
  }, [isOpen])

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
        .select('id, vin, make, model, year')
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
        throw new Error('You must be logged in to add a debt')
      }

      const debtData = {
        user_id: user.id,
        car_id: formData.car_id || null,
        creditor_name: formData.creditor_name.trim(),
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        debt_date: formData.debt_date,
        due_date: formData.due_date || null,
        status: 'pending',
        notes: formData.notes.trim() || null
      }

      const { error } = await supabase
        .from('debts')
        .insert([debtData])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        car_id: '',
        creditor_name: '',
        description: '',
        amount: '',
        currency: 'AED',
        debt_date: new Date().toISOString().split('T')[0],
        due_date: '',
        notes: ''
      })
      
      onDebtAdded()
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
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white modal-content">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add New Debt</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Creditor Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Creditor Name *</label>
            <input
              type="text"
              name="creditor_name"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.creditor_name}
              onChange={handleInputChange}
              placeholder="e.g., Bank, Supplier, Individual"
            />
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
              placeholder="e.g., Car loan, Purchase financing"
            />
          </div>

          {/* Vehicle (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Related Vehicle (Optional)</label>
            <select
              name="car_id"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.car_id}
              onChange={handleInputChange}
            >
              <option value="">No specific vehicle</option>
              {cars.map(car => (
                <option key={car.id} value={car.id}>
                  {car.year} {car.make} {car.model} - {car.vin}
                </option>
              ))}
            </select>
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

          {/* Debt Date and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Debt Date *</label>
              <input
                type="date"
                name="debt_date"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.debt_date}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Due Date</label>
              <input
                type="date"
                name="due_date"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.due_date}
                onChange={handleInputChange}
              />
            </div>
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
              placeholder="Additional notes about this debt..."
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
              {loading ? 'Adding...' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
