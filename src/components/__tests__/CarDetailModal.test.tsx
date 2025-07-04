import { render, screen } from '@testing-library/react'
import CarDetailModal from '../CarDetailModal'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } } })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: {
                id: 'test-car',
                vin: 'TEST123456789',
                make: 'Toyota',
                model: 'Camry',
                year: 2020,
                status: 'for_sale',
                purchase_price: 50000,
                purchase_currency: 'AED'
              }
            })
          }),
          order: () => Promise.resolve({ data: [] })
        })
      })
    })
  })
}))

// Mock currency utils
jest.mock('@/lib/utils/currency', () => ({
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount}`,
  convertCurrency: (amount: number) => amount
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  getStatusColor: () => 'bg-green-100 text-green-800',
  getStatusLabel: () => 'For Sale',
  getCategoryLabel: () => 'Category',
  formatDate: () => '2023-01-01',
  formatRelativeTime: () => '1 day ago'
}))

describe('CarDetailModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    carId: 'test-car',
    onCarUpdated: jest.fn()
  }

  it('should render modal with proper centering classes', () => {
    render(<CarDetailModal {...mockProps} />)
    
    // Check if the modal has the correct structure for centering
    const modalOverlay = document.querySelector('.fixed.inset-0')
    expect(modalOverlay).toBeInTheDocument()
    
    const modalContainer = document.querySelector('.relative.min-h-screen.flex.items-center.justify-center')
    expect(modalContainer).toBeInTheDocument()
    
    const modalContent = document.querySelector('.max-w-6xl')
    expect(modalContent).toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    render(<CarDetailModal {...mockProps} isOpen={false} />)
    
    const modalOverlay = document.querySelector('.fixed.inset-0')
    expect(modalOverlay).not.toBeInTheDocument()
  })

  it('should not render when carId is null', () => {
    render(<CarDetailModal {...mockProps} carId={null} />)
    
    const modalOverlay = document.querySelector('.fixed.inset-0')
    expect(modalOverlay).not.toBeInTheDocument()
  })
})
