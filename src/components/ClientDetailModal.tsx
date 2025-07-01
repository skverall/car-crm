'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Client } from '@/lib/types/database'
import { formatDate } from '@/lib/utils'
import { 
  X, 
  Edit, 
  Trash2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar
} from 'lucide-react'

interface ClientDetailModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string | null
  onClientUpdated: () => void
}

export default function ClientDetailModal({ isOpen, onClose, clientId, onClientUpdated }: ClientDetailModalProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })
  const supabase = createClient()

  const fetchClientDetails = async () => {
    if (!clientId) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()

      if (error) throw error
      setClient(data)
      
      // Initialize edit form
      setEditForm({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        notes: data.notes || ''
      })
    } catch (error) {
      console.error('Error fetching client details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientDetails()
    }
  }, [isOpen, clientId])

  const handleDelete = async () => {
    if (!client) return
    
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (error) throw error

      onClose()
      onClientUpdated()
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleUpdate = async () => {
    if (!client) return
    
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: editForm.name,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          notes: editForm.notes || null
        })
        .eq('id', client.id)

      if (error) throw error

      setIsEditing(false)
      fetchClientDetails()
      onClientUpdated()
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Failed to update client. Please try again.')
    }
  }

  if (!isOpen || !clientId) return null

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

  if (!client) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white shadow-lg rounded-md border p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{client.name}</h3>
              <p className="text-gray-600">Customer Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-gray-400 hover:text-gray-600"
              title="Edit client"
            >
              <Edit className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-600"
              title="Delete client"
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
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
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
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
              </div>
              
              {client.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {client.address && (
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">Added</p>
                  <p className="font-medium">{formatDate(client.created_at)}</p>
                </div>
              </div>

              {client.notes && (
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium">{client.notes}</p>
                  </div>
                </div>
              )}
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
                  Delete Client
                </h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete {client.name}? This action cannot be undone.
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
