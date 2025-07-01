'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Car, Client, CurrencyType, PaymentMethod } from '@/lib/types/database'
import { getAllCurrencies, formatCurrency, convertCurrency, calculateProfitInAED } from '@/lib/utils/currency'
import { X, DollarSign, User } from 'lucide-react'

interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  car: Car | null
  onSaleCompleted: () => void
}

export default function SaleModal({ isOpen, onClose, car, onSaleCompleted }: SaleModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    sale_price: '',
    sale_currency: 'AED' as CurrencyType,
    sale_date: new Date().toISOString().split('T')[0],
    client_id: '',
    new_client_name: '',
    new_client_email: '',
    new_client_phone: '',
    use_existing_client: true,
    payment_method: 'cash' as PaymentMethod
  })

  useEffect(() => {
    if (isOpen && car) {
      fetchClients()
      fetchExpenses()
    }
  }, [isOpen, car])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchExpenses = async () => {
    if (!car) return
    
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, currency')
        .eq('car_id', car.id)

      if (error) throw error
      
      const total = (data || []).reduce((sum, expense) => 
        sum + convertCurrency(expense.amount, expense.currency, 'AED'), 0)
      
      setTotalExpenses(total)
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }

  const calculateProfit = () => {
    if (!car || !formData.sale_price) return 0
    
    const salePrice = parseFloat(formData.sale_price)
    return calculateProfitInAED(
      salePrice,
      formData.sale_currency,
      car.purchase_price,
      car.purchase_currency,
      totalExpenses
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!car) return

    setLoading(true)
    setError('')

    try {
      let clientId = formData.client_id

      // Create new client if needed
      if (!formData.use_existing_client && formData.new_client_name.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert([{
            name: formData.new_client_name.trim(),
            email: formData.new_client_email.trim() || null,
            phone: formData.new_client_phone.trim() || null
          }])
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to sell a vehicle')
      }

      // Update car with sale information (only if it belongs to current user)
      const { error: updateError } = await supabase
        .from('cars')
        .update({
          sale_price: parseFloat(formData.sale_price),
          sale_currency: formData.sale_currency,
          sale_date: formData.sale_date,
          client_id: clientId || null,
          payment_method: formData.payment_method,
          status: 'sold'
        })
        .eq('id', car.id)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      onSaleCompleted()
      onClose()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  if (!isOpen || !car) return null

  const profit = calculateProfit()
  const totalCost = convertCurrency(car.purchase_price, car.purchase_currency, 'AED') + totalExpenses

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white shadow-lg rounded-md border p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Mark Vehicle as Sold</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Vehicle Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">
            {car.year} {car.make} {car.model}
          </h4>
          <p className="text-sm text-gray-600 font-mono">{car.vin}</p>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Purchase Price:</span>
              <p className="font-medium">{formatCurrency(car.purchase_price, car.purchase_currency)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Expenses:</span>
              <p className="font-medium">{formatCurrency(totalExpenses, 'AED')}</p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Total Cost:</span>
              <p className="font-medium">{formatCurrency(totalCost, 'AED')}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sale Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Sale Price *</label>
              <input
                type="number"
                name="sale_price"
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.sale_price}
                onChange={handleInputChange}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Currency *</label>
              <select
                name="sale_currency"
                required
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

          {/* Sale Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Sale Date *</label>
            <input
              type="date"
              name="sale_date"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.sale_date}
              onChange={handleInputChange}
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
            <select
              name="payment_method"
              required
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={formData.payment_method}
              onChange={handleInputChange}
            >
              <option value="cash">Cash</option>
              <option value="bank_card">Bank/Card</option>
            </select>
          </div>

          {/* Profit Calculation */}
          {formData.sale_price && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Estimated Profit/Loss:</span>
                <span className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {profit >= 0 ? '+' : ''}{formatCurrency(profit, 'AED')}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Sale: {formatCurrency(parseFloat(formData.sale_price), formData.sale_currency)} - 
                Cost: {formatCurrency(totalCost, 'AED')}
              </div>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <div className="flex items-center space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="use_existing_client"
                  checked={formData.use_existing_client}
                  onChange={() => setFormData(prev => ({ ...prev, use_existing_client: true }))}
                  className="mr-2"
                />
                Existing Client
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="use_existing_client"
                  checked={!formData.use_existing_client}
                  onChange={() => setFormData(prev => ({ ...prev, use_existing_client: false }))}
                  className="mr-2"
                />
                New Client
              </label>
            </div>

            {formData.use_existing_client ? (
              <select
                name="client_id"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.client_id}
                onChange={handleInputChange}
              >
                <option value="">Select a client (optional)</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.email && `(${client.email})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  name="new_client_name"
                  placeholder="Client name *"
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.new_client_name}
                  onChange={handleInputChange}
                />
                <input
                  type="email"
                  name="new_client_email"
                  placeholder="Email (optional)"
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.new_client_email}
                  onChange={handleInputChange}
                />
                <input
                  type="tel"
                  name="new_client_phone"
                  placeholder="Phone (optional)"
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.new_client_phone}
                  onChange={handleInputChange}
                />
              </div>
            )}
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
