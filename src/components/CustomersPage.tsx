'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Client } from '@/lib/types/database'
import { formatDate } from '@/lib/utils'
import {
  Plus,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Search,
  Trash2
} from 'lucide-react'
import ClientDetailModal from './ClientDetailModal'

interface CustomersPageProps {
  onDataUpdate?: () => void
}

export default function CustomersPage({ onDataUpdate }: CustomersPageProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  const handleClientClick = (clientId: string) => {
    setSelectedClientId(clientId)
    setShowDetailModal(true)
  }

  const handleDeleteClient = async (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the row click

    if (confirm('Are you sure you want to delete this client?')) {
      try {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', clientId)

        if (error) throw error
        fetchClients()
      } catch (error) {
        console.error('Error deleting client:', error)
        alert('Failed to delete client. Please try again.')
      }
    }
  }

  const fetchClients = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setClients([])
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setLoading(true)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('You must be logged in to manage clients')
      }

      const clientData = {
        user_id: user.id,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null
      }

      if (editingClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert([clientData])

        if (error) throw error
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
      })
      setShowAddForm(false)
      setEditingClient(null)
      fetchClients()
      onDataUpdate?.()
    } catch (error: any) {
      console.error('Error saving client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || ''
    })
    setShowAddForm(true)
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    })
    setShowAddForm(false)
    setEditingClient(null)
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (client.phone && client.phone.includes(searchTerm))
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage your customer database and contact information</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingClient ? 'Edit Customer' : 'Add New Customer'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (editingClient ? 'Update' : 'Add')} Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Customers List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <li
                key={client.id}
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleClientClick(client.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      </div>
                      <div className="mt-1 space-y-1">
                        {client.email && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-4 w-4 mr-1" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Phone className="h-4 w-4 mr-1" />
                            {client.phone}
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            {client.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      Added {formatDate(client.created_at)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(client)
                      }}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit client"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClient(client.id, e)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete client"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {client.notes && (
                  <div className="mt-2 ml-14">
                    <p className="text-sm text-gray-600 italic">{client.notes}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {filteredClients.length === 0 && !loading && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search criteria.' 
              : 'Get started by adding your first customer.'}
          </p>
        </div>
      )}

      {/* Client Detail Modal */}
      <ClientDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedClientId(null)
        }}
        clientId={selectedClientId}
        onClientUpdated={fetchClients}
      />
    </div>
  )
}
