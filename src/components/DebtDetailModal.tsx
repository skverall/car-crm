'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Debt } from '@/lib/types/debt'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import { 
  X, 
  Edit, 
  Trash2,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  FileText
} from 'lucide-react'

interface DebtDetailModalProps {
  isOpen: boolean
  onClose: () => void
  debtId: string | null
  onDebtUpdated: () => void
}

export default function DebtDetailModal({ isOpen, onClose, debtId, onDebtUpdated }: DebtDetailModalProps) {
  const [debt, setDebt] = useState<Debt | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    creditor_name: '',
    description: '',
    amount: '',
    currency: 'AED' as const,
    due_date: '',
    status: 'pending' as const
  })
  const supabase = createClient()

  const fetchDebtDetails = async () => {
    if (!debtId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('debts')
        .select(`
          *,
          cars (
            id,
            vin,
            make,
            model,
            year
          )
        `)
        .eq('id', debtId)
        .single()

      if (error) throw error
      setDebt(data)
      
      // Initialize edit form
      setEditForm({
        creditor_name: data.creditor_name,
        description: data.description || '',
        amount: data.amount.toString(),
        currency: data.currency,
        due_date: data.due_date || '',
        status: data.status
      })
    } catch (error) {
      console.error('Error fetching debt details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && debtId) {
      fetchDebtDetails()
    }
  }, [isOpen, debtId])

  const handleDelete = async () => {
    if (!debt) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('debts')
        .delete()
        .eq('id', debt.id)

      if (error) throw error

      onClose()
      onDebtUpdated()
    } catch (error) {
      console.error('Error deleting debt:', error)
      alert('Failed to delete debt. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUpdate = async () => {
    if (!debt) return
    
    try {
      const { error } = await supabase
        .from('debts')
        .update({
          creditor_name: editForm.creditor_name,
          description: editForm.description || null,
          amount: parseFloat(editForm.amount),
          currency: editForm.currency,
          due_date: editForm.due_date || null,
          status: editForm.status
        })
        .eq('id', debt.id)

      if (error) throw error

      setIsEditing(false)
      fetchDebtDetails()
      onDebtUpdated()
    } catch (error) {
      console.error('Error updating debt:', error)
      alert('Failed to update debt. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'overdue':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (!isOpen || !debtId) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!debt) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-10">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{debt.creditor_name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                {debt.status}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit debt"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-600"
              title="Delete debt"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Creditor Name</label>
              <input
                type="text"
                value={editForm.creditor_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, creditor_name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value as any }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="AED">AED</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleUpdate}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Creditor</p>
                  <p className="font-medium">{debt.creditor_name}</p>
                </div>
              </div>
              
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">{formatCurrency(debt.amount, debt.currency)}</p>
                </div>
              </div>

              {debt.due_date && (
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{formatDate(debt.due_date)}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {debt.description && (
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium">{debt.description}</p>
                  </div>
                </div>
              )}

              {debt.cars && (
                <div>
                  <p className="text-sm text-gray-500">Related Vehicle</p>
                  <p className="font-medium">{debt.cars.year} {debt.cars.make} {debt.cars.model}</p>
                  <p className="text-xs text-gray-400">VIN: {debt.cars.vin}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">{formatRelativeTime(debt.created_at)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                  Delete Debt
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete this debt from {debt.creditor_name}? This action cannot be undone.
                  </p>
                </div>
                <div className="items-center px-4 py-3">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
