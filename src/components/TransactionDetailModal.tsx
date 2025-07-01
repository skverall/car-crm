'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CashTransaction } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { X, Edit, Trash2 } from 'lucide-react'

interface TransactionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  transactionId: string | null
  onTransactionUpdated: () => void
}

export default function TransactionDetailModal({ 
  isOpen, 
  onClose, 
  transactionId, 
  onTransactionUpdated 
}: TransactionDetailModalProps) {
  const [transaction, setTransaction] = useState<CashTransaction | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransaction()
    }
  }, [isOpen, transactionId])

  const fetchTransaction = async () => {
    if (!transactionId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cash_transactions')
        .select(`
          *,
          financial_accounts!cash_transactions_account_id_fkey (
            id,
            name,
            account_type
          ),
          financial_accounts!cash_transactions_to_account_id_fkey (
            id,
            name,
            account_type
          ),
          cars (
            id,
            vin,
            make,
            model,
            year
          ),
          clients (
            id,
            name
          )
        `)
        .eq('id', transactionId)
        .single()

      if (error) throw error
      setTransaction(data)
    } catch (error) {
      console.error('Error fetching transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!transaction) return

    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('cash_transactions')
        .delete()
        .eq('id', transaction.id)

      if (error) throw error

      onTransactionUpdated()
      onClose()
    } catch (error: any) {
      console.error('Error deleting transaction:', error)
      alert(error.message)
    }
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-md border p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Transaction Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-lg">Loading transaction details...</div>
          </div>
        ) : transaction ? (
          <div className="space-y-6">
            {/* Transaction Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">
                    {transaction.description}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {getTransactionTypeLabel(transaction.transaction_type)} • {formatDate(transaction.transaction_date)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    ['deposit', 'car_sale_payment'].includes(transaction.transaction_type)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {['deposit', 'car_sale_payment'].includes(transaction.transaction_type) ? '+' : '-'}
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">Transaction Information</h5>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm text-gray-500">Account</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {transaction.account?.name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {getTransactionTypeLabel(transaction.transaction_type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Amount</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </dd>
                  </div>
                  {transaction.reference_number && (
                    <div>
                      <dt className="text-sm text-gray-500">Reference</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {transaction.reference_number}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-3">Related Information</h5>
                <dl className="space-y-2">
                  {transaction.to_account && (
                    <div>
                      <dt className="text-sm text-gray-500">Transfer To</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {transaction.to_account.name}
                      </dd>
                    </div>
                  )}
                  {transaction.car && (
                    <div>
                      <dt className="text-sm text-gray-500">Related Car</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {transaction.car.year} {transaction.car.make} {transaction.car.model}
                      </dd>
                      <dd className="text-xs text-gray-500">
                        VIN: {transaction.car.vin}
                      </dd>
                    </div>
                  )}
                  {transaction.client && (
                    <div>
                      <dt className="text-sm text-gray-500">Client</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {transaction.client.name}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm text-gray-500">Status</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Notes */}
            {transaction.notes && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">Notes</h5>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {transaction.notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-4">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Metadata</h5>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">{transaction.created_at ? formatRelativeTime(transaction.created_at) : 'Unknown'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Last Updated</dt>
                  <dd className="text-gray-900">{transaction.updated_at ? formatRelativeTime(transaction.updated_at) : 'Unknown'}</dd>
                </div>
              </dl>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Transaction
              </button>
              
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-lg text-gray-500">Transaction not found</div>
          </div>
        )}
      </div>
    </div>
  )
}
