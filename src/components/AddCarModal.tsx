'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CurrencyType, CarStatus } from '@/lib/types/database'
import { validateVIN, formatVIN } from '@/lib/utils'
import { getAllCurrencies } from '@/lib/utils/currency'
import { validateCarData, ValidationResult } from '@/lib/utils/validation'
import { SecurityAuditLogger } from '@/lib/utils/security'
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

interface AddCarModalProps {
  isOpen: boolean
  onClose: () => void
  onCarAdded: () => void
}

export default function AddCarModal({ isOpen, onClose, onCarAdded }: AddCarModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    vin: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    engine_size: '',
    fuel_type: 'gasoline',
    transmission: 'automatic',
    mileage: '',
    purchase_price: '',
    purchase_currency: 'AED' as CurrencyType,
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_location: '',
    dealer: 'Doniyor',
    status: 'for_sale' as CarStatus,
    location: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setWarnings([])
    setValidationErrors([])

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to add a vehicle')
      }

      // Validate and sanitize form data
      const validationResult = validateCarData(formData)

      if (!validationResult.isValid) {
        setValidationErrors(validationResult.errors)
        setLoading(false)
        return
      }

      if (validationResult.warnings.length > 0) {
        setWarnings(validationResult.warnings)
      }

      // Use sanitized data
      const sanitizedData = validationResult.sanitized

      // Prepare data for insertion using sanitized data
      const carData = {
        user_id: user.id,
        vin: sanitizedData.vin,
        make: sanitizedData.make,
        model: sanitizedData.model,
        year: sanitizedData.year,
        color: sanitizedData.color || null,
        engine_size: sanitizedData.engine_size || null,
        fuel_type: formData.fuel_type.trim() || null,
        transmission: formData.transmission.trim() || null,
        mileage: sanitizedData.mileage || null,
        purchase_price: sanitizedData.purchase_price,
        purchase_currency: sanitizedData.purchase_currency,
        purchase_date: sanitizedData.purchase_date,
        purchase_location: formData.purchase_location.trim() || null,
        dealer: sanitizedData.dealer || null,
        status: sanitizedData.status,
        location: sanitizedData.location || null,
        notes: sanitizedData.notes || null
      }

      const { data: insertedCar, error } = await supabase
        .from('cars')
        .insert([carData])
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw new Error(`Failed to add vehicle: ${error.message}`)
      }

      // Upload photo if provided
      if (photoFile && insertedCar) {
        const photoUrl = await uploadPhoto(insertedCar.id)
        if (photoUrl) {
          // Update car record with photo URL
          await supabase
            .from('cars')
            .update({ photo_url: photoUrl })
            .eq('id', insertedCar.id)
        }
      }

      // Log successful car addition for audit
      SecurityAuditLogger.log({
        userId: user.id,
        action: 'CREATE',
        resource: 'car',
        resourceId: insertedCar.id,
        details: {
          make: sanitizedData.make,
          model: sanitizedData.model,
          year: sanitizedData.year,
          vin: sanitizedData.vin
        }
      })

      // Reset form and close modal
      setFormData({
        vin: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        engine_size: '',
        fuel_type: 'gasoline',
        transmission: 'automatic',
        mileage: '',
        purchase_price: '',
        purchase_currency: 'AED',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_location: '',
        dealer: 'Doniyor',
        status: 'for_sale',
        location: '',
        notes: ''
      })
      setPhotoFile(null)
      setPhotoPreview(null)

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      // Create preview URL
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadPhoto = async (carId: string) => {
    if (!photoFile) return null

    try {
      // Generate unique filename
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${carId}/main.${fileExt}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('car-photos')
        .upload(fileName, photoFile, {
          cacheControl: '3600',
          upsert: true // Allow overwriting
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('car-photos')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 modal-overlay overflow-y-auto h-full w-full z-50">
      <div className="relative top-2 sm:top-4 lg:top-20 mx-auto p-2 sm:p-3 lg:p-5 w-full max-w-2xl mb-2 sm:mb-4 lg:mb-0">
        <div className="modal-content p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Vehicle</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 touch-manipulation rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Error Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4">
              <h4 className="text-red-800 text-sm font-medium mb-2">Validation Errors:</h4>
              <ul className="text-red-700 text-sm list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 sm:p-4">
              <h4 className="text-yellow-800 text-sm font-medium mb-2">Warnings:</h4>
              <ul className="text-yellow-700 text-sm list-disc list-inside">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* VIN */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              VIN *
              <span className="text-xs text-gray-500 ml-1">
                ({formData.vin.length} characters - standard is 17)
              </span>
            </label>
            <input
              type="text"
              name="vin"
              required
              className={`block w-full border rounded-lg px-3 py-3 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
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
              <select
                name="make"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2.5 sm:py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm text-gray-900 bg-white"
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
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="cvt">CVT</option>
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
                <option value="for_sale">For Sale</option>
                <option value="in_transit">In Transit</option>
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

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Photo</label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              {photoPreview && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Upload a photo of the vehicle (optional). Supported formats: JPG, PNG, WebP
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-base sm:text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 touch-manipulation transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-base sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 touch-manipulation transition-colors"
            >
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
