import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CarDetailModal from '../CarDetailModal'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock the child components
jest.mock('../AddExpenseModal', () => {
  return function MockAddExpenseModal({ isOpen }: any) {
    return isOpen ? <div data-testid="add-expense-modal">Add Expense Modal</div> : null
  }
})

jest.mock('../UploadDocumentModal', () => {
  return function MockUploadDocumentModal({ isOpen }: any) {
    return isOpen ? <div data-testid="upload-document-modal">Upload Document Modal</div> : null
  }
})

jest.mock('../EditCarModal', () => {
  return function MockEditCarModal({ isOpen }: any) {
    return isOpen ? <div data-testid="edit-car-modal">Edit Car Modal</div> : null
  }
})

jest.mock('../SaleModal', () => {
  return function MockSaleModal({ isOpen }: any) {
    return isOpen ? <div data-testid="sale-modal">Sale Modal</div> : null
  }
})

const mockCar = {
  id: '1',
  vin: 'TEST123456789',
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  status: 'available',
  purchase_price: 50000,
  purchase_currency: 'AED',
  purchase_date: '2023-01-01',
  user_id: 'user1'
}

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user1' } }
    })
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: mockCar, error: null })
        })),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    }))
  }))
}

beforeEach(() => {
  ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
})

describe('CarDetailModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    carId: '1',
    onCarUpdated: jest.fn()
  }

  it('should render with full-screen flexbox layout', async () => {
    render(<CarDetailModal {...defaultProps} />)

    await waitFor(() => {
      const modalContainer = document.querySelector('.fixed.inset-0')
      expect(modalContainer).toBeInTheDocument()
      expect(modalContainer).toHaveClass('flex', 'flex-col', 'min-h-screen')
    })

    const modalContent = document.querySelector('.full-screen-modal')
    expect(modalContent).toBeInTheDocument()
    expect(modalContent).toHaveClass('flex-1', 'flex', 'flex-col')
  })

  it('should have proper flexbox structure for full height', async () => {
    render(<CarDetailModal {...defaultProps} />)

    await waitFor(() => {
      const innerContainer = document.querySelector('.w-full.flex-1.bg-white')
      expect(innerContainer).toBeInTheDocument()
      expect(innerContainer).toHaveClass('flex', 'flex-col')
    })
  })

  it('should not render when isOpen is false', () => {
    render(<CarDetailModal {...defaultProps} isOpen={false} />)
    
    const modalContainer = document.querySelector('.fixed.inset-0')
    expect(modalContainer).not.toBeInTheDocument()
  })

  it('should not render when carId is null', () => {
    render(<CarDetailModal {...defaultProps} carId={null} />)
    
    const modalContainer = document.querySelector('.fixed.inset-0')
    expect(modalContainer).not.toBeInTheDocument()
  })
})
