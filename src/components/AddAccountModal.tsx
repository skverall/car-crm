'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AccountType, CurrencyType } from '@/lib/types/database'
import { X } from 'lucide-react'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded: () => void
}

export default function AddAccountModal({ isOpen, onClose, onAccountAdded }: AddAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    account_type: 'cash' as AccountType,
    currency: 'AED' as CurrencyType,
    initial_balance: '',
    account_number: '',
    bank_name: '',
    description: ''
  })
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to add an account')
      }

      const accountData = {
        user_id: user.id,
        name: formData.name.trim(),
        account_type: formData.account_type,
        currency: formData.currency,
        initial_balance: parseFloat(formData.initial_balance) || 0,
        current_balance: parseFloat(formData.initial_balance) || 0,
        account_number: formData.account_number.trim() || null,
        bank_name: formData.bank_name.trim() || null,
        description: formData.description.trim() || null,
        is_active: true
      }

      const { error } = await supabase
        .from('financial_accounts')
        .insert([accountData])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        name: '',
        account_type: 'cash',
        currency: 'AED',
        initial_balance: '',
        account_number: '',
        bank_name: '',
        description: ''
      })
      onAccountAdded()
      onClose()
    } catch (error: any) {
      console.error('Error adding account:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getAccountTypeLabel = (type: AccountType) => {
    const labels: Record<AccountType, string> = {
      cash: 'Cash',
      bank_checking: 'Bank Checking Account',
      bank_savings: 'Bank Savings Account',
      credit_card: 'Credit Card',
      other: 'Other'
    }
    return labels[type] || type
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-md border p-5">
          <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Add Financial Account</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Account Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Main Cash, Business Checking"
              required
            />
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="account_type" className="block text-sm font-medium text-gray-700">
              Account Type *
            </label>
            <select
              id="account_type"
              value={formData.account_type}
              onChange={(e) => setFormData({ ...formData, account_type: e.target.value as AccountType })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_checking">Bank Checking Account</option>
              <option value="bank_savings">Bank Savings Account</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
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

          {/* Initial Balance */}
          <div>
            <label htmlFor="initial_balance" className="block text-sm font-medium text-gray-700">
              Initial Balance
            </label>
            <input
              type="number"
              id="initial_balance"
              step="0.01"
              min="0"
              value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Account Number (for bank accounts) */}
          {['bank_checking', 'bank_savings', 'credit_card'].includes(formData.account_type) && (
            <div>
              <label htmlFor="account_number" className="block text-sm font-medium text-gray-700">
                Account Number
              </label>
              <input
                type="text"
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Account number"
              />
            </div>
          )}

          {/* Bank Name (for bank accounts) */}
          {['bank_checking', 'bank_savings'].includes(formData.account_type) && (
            <div>
              <label htmlFor="bank_name" className="block text-sm font-medium text-gray-700">
                Bank Name
              </label>
              <input
                type="text"
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Bank name"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Optional description or notes"
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
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
