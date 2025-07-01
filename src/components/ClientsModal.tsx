'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Client } from '@/lib/types/database'
import { formatDate } from '@/lib/utils'
import { 
  X, 
  Plus, 
  User, 
  Mail, 
  Phone,
  MapPin,
  Edit,
  Search
} from 'lucide-react'

interface ClientsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ClientsModal({ isOpen, onClose }: ClientsModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchClients()
    }
  }, [isOpen])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50">
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white shadow-lg rounded-md border p-5">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <User className="h-8 w-8 text-blue-600 mr-3" />
            <h3 className="text-2xl font-bold text-gray-900">Client Management</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {!showAddForm ? (
          <>
            {/* Search and Add Button */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center ml-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </button>
            </div>

            {/* Clients List */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <li key={client.id} className="px-6 py-4">
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
                          <div className="text-right text-sm text-gray-500">
                            <p>Added {formatDate(client.created_at)}</p>
                          </div>
                          <button
                            onClick={() => handleEdit(client)}
                            className="text-blue-600 hover:text-blue-500"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {client.notes && (
                        <div className="mt-2 text-sm text-gray-600">
                          <p>{client.notes}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {filteredClients.length === 0 && (
                  <div className="text-center py-12">
                    <User className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first client.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Add/Edit Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h4>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client full name"
              />
            </div>

            {/* Email and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="client@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+971501234567"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Client address"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the client..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
