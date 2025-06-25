'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyType, CarStatus } from '@/lib/types/database'
import { validateVIN, formatVIN } from '@/lib/utils'
import { getAllCurrencies } from '@/lib/utils/currency'
import { X } from 'lucide-react'

interface AddCarModalProps {
  isOpen: boolean
  onClose: () => void
  onCarAdded: () => void
}

export default function AddCarModal({ isOpen, onClose, onCarAdded }: AddCarModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    engine_size: '',
    fuel_type: '',
    transmission: '',
    mileage: '',
    purchase_price: '',
    purchase_currency: 'AED' as CurrencyType,
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_location: '',
    dealer: '',
    status: 'in_transit' as CarStatus,
    location: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Format VIN but don't block submission for invalid VIN
      const formattedVIN = formatVIN(formData.vin)

      // Show warnings but don't prevent submission
      let warnings = []
      if (formattedVIN.length !== 17) {
        warnings.push(`Warning: VIN length is ${formattedVIN.length} characters instead of standard 17`)
      }

      if (!validateVIN(formattedVIN)) {
        warnings.push('Warning: VIN format may be invalid (standard VIN contains only letters except I, O, Q and numbers)')
      }

      // If there are warnings, show them but continue with submission
      if (warnings.length > 0) {
        console.warn('VIN warnings:', warnings.join('; '))
      }

      // Prepare data for insertion
      const carData = {
        vin: formattedVIN,
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year,
        color: formData.color.trim() || null,
        engine_size: formData.engine_size.trim() || null,
        fuel_type: formData.fuel_type.trim() || null,
        transmission: formData.transmission.trim() || null,
        mileage: formData.mileage ? parseInt(formData.mileage) : null,
        purchase_price: parseFloat(formData.purchase_price),
        purchase_currency: formData.purchase_currency,
        purchase_date: formData.purchase_date,
        purchase_location: formData.purchase_location.trim() || null,
        status: formData.status,
        location: formData.location.trim() || null,
        notes: formData.notes.trim() || null
      }

      const { error } = await supabase
        .from('cars')
        .insert([carData])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        engine_size: '',
        fuel_type: '',
        transmission: '',
        mileage: '',
        purchase_price: '',
        purchase_currency: 'AED',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_location: '',
        dealer: '',
        status: 'in_transit',
        location: '',
        notes: ''
      })
      
      onCarAdded()
      onClose()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
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
      <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-4 sm:mb-0">
        <div className="flex justify-between items-center mb-4 sm:mb-4">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Add New Vehicle</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 touch-manipulation"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              VIN *
              <span className="text-xs text-gray-500 ml-1">
                ({formData.vin.length} characters - standard is 17)
              </span>
            </label>
            <input
              type="text"
              name="vin"
              required
              className={`mt-1 block w-full border rounded-md px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm ${
                formData.vin.length === 17 ? 'border-green-300' : 'border-yellow-300'
              }`}
              value={formData.vin}
              onChange={handleInputChange}
              placeholder="Enter VIN (any length accepted)"
            />
            {formData.vin.length > 0 && formData.vin.length !== 17 && (
              <p className="mt-1 text-xs text-yellow-600">
                ⚠️ Non-standard VIN length (standard is 17 characters)
              </p>
            )}
            {formData.vin.length > 0 && !validateVIN(formatVIN(formData.vin)) && (
              <p className="mt-1 text-xs text-yellow-600">
                ⚠️ VIN format may be non-standard
              </p>
            )}
          </div>

          {/* Make and Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Make *</label>
              <input
                type="text"
                name="make"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm text-gray-900 bg-white"
                value={formData.make}
                onChange={handleInputChange}
                placeholder="e.g., Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model *</label>
              <input
                type="text"
                name="model"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="e.g., Camry"
              />
            </div>
          </div>

          {/* Year and Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Year *</label>
              <input
                type="number"
                name="year"
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.year}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <input
                type="text"
                name="color"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="e.g., White"
              />
            </div>
          </div>

          {/* Engine and Transmission */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Engine Size</label>
              <input
                type="text"
                name="engine_size"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.engine_size}
                onChange={handleInputChange}
                placeholder="e.g., 2.5L"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
              <select
                name="fuel_type"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.fuel_type}
                onChange={handleInputChange}
              >
                <option value="">Select</option>
                <option value="Gasoline">Gasoline</option>
                <option value="Diesel">Diesel</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Transmission</label>
              <select
                name="transmission"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.transmission}
                onChange={handleInputChange}
              >
                <option value="">Select</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
                <option value="CVT">CVT</option>
              </select>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Purchase Information</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Price *</label>
                <input
                  type="number"
                  name="purchase_price"
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.purchase_price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency *</label>
                <select
                  name="purchase_currency"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.purchase_currency}
                  onChange={handleInputChange}
                >
                  {getAllCurrencies().map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Date *</label>
                <input
                  type="date"
                  name="purchase_date"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Purchase Location</label>
                <input
                  type="text"
                  name="purchase_location"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.purchase_location}
                  onChange={handleInputChange}
                  placeholder="e.g., Dubai, UAE"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Dealer/Supplier</label>
              <input
                type="text"
                name="dealer"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.dealer}
                onChange={handleInputChange}
                placeholder="e.g., ABC Motors, John Smith"
              />
            </div>
          </div>

          {/* Status and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Status *</label>
              <select
                name="status"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="in_transit">In Transit</option>
                <option value="for_sale">For Sale</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Location</label>
              <input
                type="text"
                name="location"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Warehouse A"
              />
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Mileage (km)</label>
            <input
              type="number"
              name="mileage"
              min="0"
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.mileage}
              onChange={handleInputChange}
              placeholder="0"
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
              placeholder="Additional notes about the vehicle..."
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 touch-manipulation"
            >
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
