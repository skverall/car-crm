'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FinancialAccount, TransactionType, CurrencyType, Car, Client } from '@/lib/types/database'
import { X } from 'lucide-react'

interface AddTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onTransactionAdded: () => void
  accounts: FinancialAccount[]
}

export default function AddTransactionModal({ 
  isOpen, 
  onClose, 
  onTransactionAdded, 
  accounts 
}: AddTransactionModalProps) {
  const [loading, setLoading] = useState(false)
  const [cars, setCars] = useState<Car[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    account_id: '',
    transaction_type: 'deposit' as TransactionType,
    amount: '',
    currency: 'AED' as CurrencyType,
    description: '',
    reference_number: '',
    car_id: '',
    client_id: '',
    to_account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchRelatedData()
    }
  }, [isOpen])

  const fetchRelatedData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch cars
      const { data: carsData } = await supabase
        .from('cars')
        .select('id, vin, make, model, year')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setCars(carsData || [])

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      setClients(clientsData || [])
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.account_id || !formData.description.trim() || !formData.amount) return

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to add a transaction')
      }

      const transactionData = {
        user_id: user.id,
        account_id: formData.account_id,
        transaction_type: formData.transaction_type,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description.trim(),
        reference_number: formData.reference_number.trim() || null,
        car_id: formData.car_id || null,
        client_id: formData.client_id || null,
        to_account_id: formData.to_account_id || null,
        transaction_date: formData.transaction_date,
        status: 'completed' as const,
        notes: formData.notes.trim() || null
      }

      const { error } = await supabase
        .from('cash_transactions')
        .insert([transactionData])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        account_id: '',
        transaction_type: 'deposit',
        amount: '',
        currency: 'AED',
        description: '',
        reference_number: '',
        car_id: '',
        client_id: '',
        to_account_id: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      onTransactionAdded()
      onClose()
    } catch (error: any) {
      console.error('Error adding transaction:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getTransactionTypeLabel = (type: TransactionType) => {
    const labels: Record<TransactionType, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transfer: 'Transfer',
      car_sale_payment: 'Car Sale Payment',
      car_purchase_payment: 'Car Purchase Payment',
      expense_payment: 'Expense Payment',
      debt_payment: 'Debt Payment',
      other: 'Other'
    }
    return labels[type] || type
  }

  // Filter accounts for transfer destination (exclude source account)
  const availableToAccounts = accounts.filter(account => 
    account.id !== formData.account_id && account.is_active
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-md border p-5">
          <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Transaction</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account */}
            <div>
              <label htmlFor="account_id" className="block text-sm font-medium text-gray-700">
                Account *
              </label>
              <select
                id="account_id"
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select account</option>
                {accounts.filter(account => account.is_active).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label htmlFor="transaction_type" className="block text-sm font-medium text-gray-700">
                Transaction Type *
              </label>
              <select
                id="transaction_type"
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value as TransactionType })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="transfer">Transfer</option>
                <option value="car_sale_payment">Car Sale Payment</option>
                <option value="car_purchase_payment">Car Purchase Payment</option>
                <option value="expense_payment">Expense Payment</option>
                <option value="debt_payment">Debt Payment</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            {/* Currency */}
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                Currency *
              </label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value as CurrencyType })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="AED">AED</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>

            {/* Transaction Date */}
            <div>
              <label htmlFor="transaction_date" className="block text-sm font-medium text-gray-700">
                Transaction Date *
              </label>
              <input
                type="date"
                id="transaction_date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Reference Number */}
            <div>
              <label htmlFor="reference_number" className="block text-sm font-medium text-gray-700">
                Reference Number
              </label>
              <input
                type="text"
                id="reference_number"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Check #, Transfer ID, etc."
              />
            </div>
          </div>

          {/* Transfer To Account (only for transfers) */}
          {formData.transaction_type === 'transfer' && (
            <div>
              <label htmlFor="to_account_id" className="block text-sm font-medium text-gray-700">
                Transfer To Account *
              </label>
              <select
                id="to_account_id"
                value={formData.to_account_id}
                onChange={(e) => setFormData({ ...formData, to_account_id: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required={formData.transaction_type === 'transfer'}
              >
                <option value="">Select destination account</option>
                {availableToAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Related Car (for car-related transactions) */}
          {['car_sale_payment', 'car_purchase_payment'].includes(formData.transaction_type) && (
            <div>
              <label htmlFor="car_id" className="block text-sm font-medium text-gray-700">
                Related Car
              </label>
              <select
                id="car_id"
                value={formData.car_id}
                onChange={(e) => setFormData({ ...formData, car_id: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select car (optional)</option>
                {cars.map((car) => (
                  <option key={car.id} value={car.id}>
                    {car.year} {car.make} {car.model} - {car.vin}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Related Client (for sale payments) */}
          {formData.transaction_type === 'car_sale_payment' && (
            <div>
              <label htmlFor="client_id" className="block text-sm font-medium text-gray-700">
                Client
              </label>
              <select
                id="client_id"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select client (optional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description *
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of the transaction"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or details"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
