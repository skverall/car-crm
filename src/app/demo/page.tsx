'use client'

import { useState } from 'react'
import CarDetailModal from '@/components/CarDetailModal'
import { Car, Expense, Document } from '@/lib/types/database'

// Mock data for demonstration
const mockCar: Car = {
  id: '1',
  vin: 'JN1AZ4EH4CM123456',
  make: 'Nissan',
  model: 'Maxima SV',
  year: 2017,
  color: 'Red',
  engine_size: '3.5L V6',
  fuel_type: 'gasoline',
  transmission: 'automatic',
  mileage: 107500,
  purchase_price: 26350,
  purchase_currency: 'AED',
  purchase_date: '2025-07-01',
  purchase_location: 'Dubai',
  dealer: 'Al Futtaim Motors',
  sale_price: null,
  sale_currency: 'AED',
  sale_date: null,
  status: 'for_sale',
  location: 'Dubai Showroom',
  notes: 'Excellent condition vehicle with full service history. Recently serviced with new tires and brake pads. Interior is pristine with leather seats.',
  user_id: 'demo-user',
  created_at: '2025-07-01T10:00:00Z',
  updated_at: '2025-07-01T10:00:00Z'
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    car_id: '1',
    category: 'transport',
    amount: 1750,
    currency: 'AED',
    description: 'Shipping from USA to Dubai',
    expense_date: '2025-07-02',
    user_id: 'demo-user',
    created_at: '2025-07-02T10:00:00Z',
    updated_at: '2025-07-02T10:00:00Z'
  },
  {
    id: '2',
    car_id: '1',
    category: 'customs',
    amount: 2100,
    currency: 'AED',
    description: 'Import duties and customs clearance',
    expense_date: '2025-07-03',
    user_id: 'demo-user',
    created_at: '2025-07-03T10:00:00Z',
    updated_at: '2025-07-03T10:00:00Z'
  },
  {
    id: '3',
    car_id: '1',
    category: 'maintenance',
    amount: 850,
    currency: 'AED',
    description: 'Full service and inspection',
    expense_date: '2025-07-04',
    user_id: 'demo-user',
    created_at: '2025-07-04T10:00:00Z',
    updated_at: '2025-07-04T10:00:00Z'
  }
]

const mockDocuments: Document[] = [
  {
    id: '1',
    car_id: '1',
    name: 'Purchase Invoice.pdf',
    type: 'invoice',
    file_url: '#',
    user_id: 'demo-user',
    uploaded_at: '2025-07-01T10:00:00Z'
  },
  {
    id: '2',
    car_id: '1',
    name: 'Shipping Documents.pdf',
    type: 'shipping',
    file_url: '#',
    user_id: 'demo-user',
    uploaded_at: '2025-07-02T10:00:00Z'
  }
]

export default function DemoPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Car CRM - Enhanced Overview Demo
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Демонстрация улучшенного дизайна панели автомобиля с детальной финансовой информацией
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
          >
            Открыть панель автомобиля
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Улучшения дизайна:</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• Красочные карточки с градиентами для финансовых показателей</li>
            <li>• Детальный анализ ROI и маржи прибыли</li>
            <li>• Визуальные индикаторы прибыли/убытка</li>
            <li>• Улучшенная секция истории транзакций</li>
            <li>• Современные иконки и типографика</li>
            <li>• Интерактивные элементы и статистика</li>
          </ul>
        </div>
      </div>

      {/* Mock CarDetailModal with demo data */}
      {showModal && (
        <div className="fixed inset-0 bg-white overflow-y-auto h-full w-full z-50 flex flex-col min-h-screen">
          <div className="relative flex-1 full-screen-modal flex flex-col">
            <div className="w-full flex-1 bg-white p-6 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Demo - Enhanced Car Overview</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {/* This would normally be the CarDetailModal component */}
              <div className="text-center py-20">
                <p className="text-lg text-gray-600">
                  Здесь будет отображаться улучшенная панель автомобиля.
                  <br />
                  Для полной демонстрации необходимо настроить Supabase.
                </p>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-4 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
