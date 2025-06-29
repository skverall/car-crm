'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, CurrencyType, CarStatus } from '@/lib/types/database'
import { getAllCurrencies } from '@/lib/utils/currency'
import { X } from 'lucide-react'

// Car manufacturers list
const CAR_MANUFACTURERS = [
  'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'Cadillac',
  'Chevrolet', 'Chrysler', 'Citroën', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Genesis',
  'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini',
  'Land Rover', 'Lexus', 'Lincoln', 'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz',
  'MINI', 'Mitsubishi', 'Nissan', 'Peugeot', 'Porsche', 'Ram', 'Renault', 'Rolls-Royce',
  'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo'
].sort()

// Standard car colors
const CAR_COLORS = [
  'White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown',
  'Yellow', 'Orange', 'Purple', 'Gold', 'Beige', 'Maroon', 'Navy', 'Pink'
].sort()

// Generate years from 1990 to current year + 1
const generateYears = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let year = currentYear + 1; year >= 1990; year--) {
    years.push(year)
  }
  return years
}

const AVAILABLE_YEARS = generateYears()

interface EditCarModalProps {
  isOpen: boolean
  onClose: () => void
  car: Car | null
  onCarUpdated: () => void
}

export default function EditCarModal({ isOpen, onClose, car, onCarUpdated }: EditCarModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const [formData, setFormData] = useState({
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
    purchase_date: '',
    purchase_location: '',
    dealer: '',
    sale_price: '',
    sale_currency: 'AED' as CurrencyType,
    sale_date: '',
    status: 'in_transit' as CarStatus,
    location: '',
    notes: ''
  })

  useEffect(() => {
    if (car && isOpen) {
      setFormData({
        make: car.make,
        model: car.model,
        year: car.year,
        color: car.color || '',
        engine_size: car.engine_size || '',
        fuel_type: car.fuel_type || '',
        transmission: car.transmission || '',
        mileage: car.mileage?.toString() || '',
        purchase_price: car.purchase_price.toString(),
        purchase_currency: car.purchase_currency,
        purchase_date: car.purchase_date,
        purchase_location: car.purchase_location || '',
        dealer: car.dealer || '',
        sale_price: car.sale_price?.toString() || '',
        sale_currency: car.sale_currency || 'AED',
        sale_date: car.sale_date || '',
        status: car.status,
        location: car.location || '',
        notes: car.notes || ''
      })
    }
  }, [car, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!car) return

    setLoading(true)
    setError('')

    try {
      // Prepare data for update
      const updateData = {
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
        dealer: formData.dealer.trim() || null,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        sale_currency: formData.sale_price ? formData.sale_currency : null,
        sale_date: formData.sale_date || null,
        status: formData.status,
        location: formData.location.trim() || null,
        notes: formData.notes.trim() || null
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to edit a vehicle')
      }

      const { error } = await supabase
        .from('cars')
        .update(updateData)
        .eq('id', car.id)
        .eq('user_id', user.id)

      if (error) throw error

      onCarUpdated()
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

  if (!isOpen || !car) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Vehicle - {car.vin}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Make *</label>
              <select
                name="make"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.make}
                onChange={handleInputChange}
              >
                <option value="">Select Make</option>
                {CAR_MANUFACTURERS.map(make => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model *</label>
              <input
                type="text"
                name="model"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.model}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Year *</label>
              <select
                name="year"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.year}
                onChange={handleInputChange}
              >
                {AVAILABLE_YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Color</label>
              <select
                name="color"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.color}
                onChange={handleInputChange}
              >
                <option value="">Select Color</option>
                {CAR_COLORS.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mileage (km)</label>
              <input
                type="number"
                name="mileage"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.mileage}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Engine Size</label>
              <input
                type="text"
                name="engine_size"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.engine_size}
                onChange={handleInputChange}
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
                <option value="gasoline">Gasoline</option>
                <option value="diesel">Diesel</option>
                <option value="hybrid">Hybrid</option>
                <option value="electric">Electric</option>
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
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
              </select>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Purchase Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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

          {/* Sale Information */}
          <div className="border-t pt-4">
            <h4 className="text-md font-medium text-gray-900 mb-3">Sale Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Price</label>
                <input
                  type="number"
                  name="sale_price"
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.sale_price}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sale Currency</label>
                <select
                  name="sale_currency"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.sale_currency}
                  onChange={handleInputChange}
                >
                  {getAllCurrencies().map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Sale Date</label>
              <input
                type="date"
                name="sale_date"
                className="mt-1 block w-full md:w-1/2 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.sale_date}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Status and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {loading ? 'Updating...' : 'Update Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
