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
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock
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
      <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
        <div className="relative min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white shadow-lg rounded-md border p-5">
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!debt) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50 flex flex-col min-h-screen">
      <div className="relative flex-1 full-screen-modal flex flex-col">
        <div className="w-full flex-1 bg-white p-6 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                debt.status === 'paid'
                  ? 'bg-green-100'
                  : debt.status === 'overdue'
                    ? 'bg-red-100'
                    : 'bg-amber-100'
              }`}>
                <CreditCard className={`h-6 w-6 ${
                  debt.status === 'paid'
                    ? 'text-green-600'
                    : debt.status === 'overdue'
                      ? 'text-red-600'
                      : 'text-amber-600'
                }`} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{debt.creditor_name}</h3>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(debt.status)}`}>
                    {debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                  </span>
                  <span className="ml-3 text-2xl font-bold text-gray-900">
                    {formatCurrency(debt.amount, debt.currency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit debt"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete debt"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
          <div className="space-y-8">
            {/* Debt Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Amount Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                    Amount
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-600 font-medium">Debt Amount</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(debt.amount, debt.currency)}
                  </p>
                  <p className="text-xs text-blue-500">Original debt</p>
                </div>
              </div>

              {/* Due Date Card */}
              <div className={`bg-gradient-to-br rounded-xl p-6 border ${
                debt.status === 'overdue'
                  ? 'from-red-50 to-red-100 border-red-200'
                  : 'from-amber-50 to-amber-100 border-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    debt.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'
                  }`}>
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    debt.status === 'overdue'
                      ? 'text-red-600 bg-red-200'
                      : 'text-amber-600 bg-amber-200'
                  }`}>
                    Due Date
                  </span>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${
                    debt.status === 'overdue' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {debt.due_date ? 'Due Date' : 'No Due Date'}
                  </p>
                  <p className={`text-2xl font-bold ${
                    debt.status === 'overdue' ? 'text-red-900' : 'text-amber-900'
                  }`}>
                    {debt.due_date ? formatDate(debt.due_date) : 'Not Set'}
                  </p>
                  <p className={`text-xs ${
                    debt.status === 'overdue' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {debt.status === 'overdue' ? 'Past due' : 'Payment deadline'}
                  </p>
                </div>
              </div>

              {/* Status Card */}
              <div className={`bg-gradient-to-br rounded-xl p-6 border ${
                debt.status === 'paid'
                  ? 'from-green-50 to-green-100 border-green-200'
                  : debt.status === 'overdue'
                    ? 'from-red-50 to-red-100 border-red-200'
                    : 'from-amber-50 to-amber-100 border-amber-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    debt.status === 'paid'
                      ? 'bg-green-500'
                      : debt.status === 'overdue'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                  }`}>
                    {debt.status === 'paid' ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : debt.status === 'overdue' ? (
                      <AlertTriangle className="h-5 w-5 text-white" />
                    ) : (
                      <Clock className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    debt.status === 'paid'
                      ? 'text-green-600 bg-green-200'
                      : debt.status === 'overdue'
                        ? 'text-red-600 bg-red-200'
                        : 'text-amber-600 bg-amber-200'
                  }`}>
                    Status
                  </span>
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-medium ${
                    debt.status === 'paid'
                      ? 'text-green-600'
                      : debt.status === 'overdue'
                        ? 'text-red-600'
                        : 'text-amber-600'
                  }`}>
                    Current Status
                  </p>
                  <p className={`text-2xl font-bold ${
                    debt.status === 'paid'
                      ? 'text-green-900'
                      : debt.status === 'overdue'
                        ? 'text-red-900'
                        : 'text-amber-900'
                  }`}>
                    {debt.status.charAt(0).toUpperCase() + debt.status.slice(1)}
                  </p>
                  <p className={`text-xs ${
                    debt.status === 'paid'
                      ? 'text-green-500'
                      : debt.status === 'overdue'
                        ? 'text-red-500'
                        : 'text-amber-500'
                  }`}>
                    {debt.status === 'paid'
                      ? 'Debt settled'
                      : debt.status === 'overdue'
                        ? 'Requires attention'
                        : 'Awaiting payment'}
                  </p>
                </div>
              </div>
            </div>

            {/* Debt Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Creditor Information */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-600" />
                  Creditor Information
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Creditor Name</span>
                    <span className="font-semibold text-gray-900">{debt.creditor_name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600 font-medium">Debt Date</span>
                    <span className="font-medium text-gray-900">{formatDate(debt.debt_date)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 font-medium">Added</span>
                    <span className="font-medium text-gray-900">
                      {debt.created_at ? formatRelativeTime(debt.created_at) : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-gray-600" />
                  Additional Details
                </h4>
                <div className="space-y-4">
                  {debt.description ? (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h5 className="font-medium text-blue-900 mb-2">Description</h5>
                      <p className="text-blue-800 text-sm leading-relaxed">{debt.description}</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                      <p className="text-gray-500 text-sm">No description provided</p>
                    </div>
                  )}

                  {debt.cars && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-gray-600" />
                        Related Vehicle
                      </h5>
                      <p className="text-gray-800 font-medium">
                        {debt.cars.year} {debt.cars.make} {debt.cars.model}
                      </p>
                      <p className="text-gray-600 text-sm font-mono">{debt.cars.vin}</p>
                    </div>
                  )}

                  {debt.notes && (
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                      <h5 className="font-medium text-amber-900 mb-2">Notes</h5>
                      <p className="text-amber-800 text-sm leading-relaxed">{debt.notes}</p>
                    </div>
                  )}
                </div>
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
    </div>
  )
}
