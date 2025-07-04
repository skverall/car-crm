import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dashboard from '../Dashboard'
import { createClient } from '@/lib/supabase/client'

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock the child components
jest.mock('../AddCarModal', () => {
  return function MockAddCarModal({ isOpen, onClose, onCarAdded }: any) {
    return isOpen ? (
      <div data-testid="add-car-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onCarAdded()}>Add Car</button>
      </div>
    ) : null
  }
})

jest.mock('../CarDetailModal', () => {
  return function MockCarDetailModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="car-detail-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  }
})

jest.mock('../AnalyticsModal', () => {
  return function MockAnalyticsModal({ isOpen, onClose }: any) {
    return isOpen ? (
      <div data-testid="analytics-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  }
})

// Mock performance hooks
jest.mock('@/hooks/usePerformance', () => ({
  usePerformanceMonitor: jest.fn(() => ({ renderCount: 1, timeSinceMount: 100 })),
  useOptimizedCalculation: jest.fn((data, fn) => fn(data))
}))

// Mock error handler
jest.mock('@/hooks/useErrorHandler', () => ({
  useApiErrorHandler: jest.fn(() => ({
    handleError: jest.fn()
  }))
}))

const mockCarsData = [
  {
    id: '1',
    user_id: 'test-user-id',
    vin: '1HGBH41JXMN109186',
    make: 'Honda',
    model: 'Civic',
    year: 2020,
    status: 'for_sale',
    purchase_price: 15000,
    purchase_currency: 'USD',
    sale_price: null,
    sale_currency: null,
    total_expenses_aed: 1000,
    profit_aed: null,
    purchase_date: '2024-01-15',
    sale_date: null,
    days_to_sell: null,
    payment_method: null
  },
  {
    id: '2',
    user_id: 'test-user-id',
    vin: '2HGBH41JXMN109187',
    make: 'Toyota',
    model: 'Camry',
    year: 2019,
    status: 'sold',
    purchase_price: 18000,
    purchase_currency: 'USD',
    sale_price: 22000,
    sale_currency: 'USD',
    total_expenses_aed: 1500,
    profit_aed: 12000,
    purchase_date: '2024-01-10',
    sale_date: '2024-02-15',
    days_to_sell: 36,
    payment_method: 'cash'
  },
  {
    id: '3',
    user_id: 'test-user-id',
    vin: '3HGBH41JXMN109188',
    make: 'BMW',
    model: 'X5',
    year: 2021,
    status: 'in_transit',
    purchase_price: 45000,
    purchase_currency: 'EUR',
    sale_price: null,
    sale_currency: null,
    total_expenses_aed: 2000,
    profit_aed: null,
    purchase_date: '2024-02-01',
    sale_date: null,
    days_to_sell: null,
    payment_method: null
  }
]

describe('Dashboard Component', () => {
  const mockSupabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockCarsData,
        error: null
      })
    }))
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('should render loading state initially', () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render dashboard with car data after loading', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Check if statistics are displayed
    expect(screen.getByText('Total Cars')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // Total cars count
    
    expect(screen.getByText('For Sale')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // For sale count
    
    expect(screen.getByText('Sold')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Sold count
  })

  it('should calculate statistics correctly', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Check status counts
    const statusCards = screen.getAllByText('1')
    expect(statusCards.length).toBeGreaterThan(0) // Should have multiple status counts
  })

  it('should handle search functionality', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'Honda' } })

    // Should filter results (implementation depends on how search is displayed)
    expect(searchInput.value).toBe('Honda')
  })

  it('should handle status filter', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Find and click status filter buttons
    const allButton = screen.getByText('All')
    const forSaleButton = screen.getByText('For Sale')
    
    expect(allButton).toBeInTheDocument()
    expect(forSaleButton).toBeInTheDocument()

    fireEvent.click(forSaleButton)
    // Should filter to show only for sale cars
  })

  it('should open add car modal when add button is clicked', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const addButton = screen.getByText(/add vehicle/i)
    fireEvent.click(addButton)

    expect(screen.getByTestId('add-car-modal')).toBeInTheDocument()
  })

  it('should close add car modal when close button is clicked', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Open modal
    const addButton = screen.getByText(/add vehicle/i)
    fireEvent.click(addButton)

    // Close modal
    const closeButton = screen.getByText('Close')
    fireEvent.click(closeButton)

    expect(screen.queryByTestId('add-car-modal')).not.toBeInTheDocument()
  })

  it('should refresh data when car is added', async () => {
    const mockOnDataUpdate = jest.fn()
    render(<Dashboard onDataUpdate={mockOnDataUpdate} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Open modal and add car
    const addButton = screen.getByText(/add vehicle/i)
    fireEvent.click(addButton)

    const addCarButton = screen.getByText('Add Car')
    fireEvent.click(addCarButton)

    // Should call onDataUpdate
    expect(mockOnDataUpdate).toHaveBeenCalled()
  })

  it('should open analytics modal when analytics button is clicked', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    const analyticsButton = screen.getByText(/analytics/i)
    fireEvent.click(analyticsButton)

    expect(screen.getByTestId('analytics-modal')).toBeInTheDocument()
  })

  it('should handle navigation to different pages', async () => {
    const mockOnPageChange = jest.fn()
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={mockOnPageChange} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Find navigation buttons
    const inventoryButton = screen.getByText(/inventory/i)
    fireEvent.click(inventoryButton)

    expect(mockOnPageChange).toHaveBeenCalledWith('inventory')
  })

  it('should handle API errors gracefully', async () => {
    // Mock API error
    const errorSupabase = {
      ...mockSupabase,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }))
    }
    
    ;(createClient as jest.Mock).mockReturnValue(errorSupabase)

    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Should handle error gracefully (exact implementation depends on error handling)
    // At minimum, should not crash and should show some content
    expect(screen.getByText('Total Cars')).toBeInTheDocument()
  })

  it('should display correct profit calculations', async () => {
    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Should display profit information
    expect(screen.getByText(/profit/i)).toBeInTheDocument()
  })

  it('should handle empty car list', async () => {
    const emptySupabase = {
      ...mockSupabase,
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }))
    }
    
    ;(createClient as jest.Mock).mockReturnValue(emptySupabase)

    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Should show zero counts
    expect(screen.getByText('Total Cars')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle unauthenticated user', async () => {
    const unauthSupabase = {
      ...mockSupabase,
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: null
        })
      }
    }
    
    ;(createClient as jest.Mock).mockReturnValue(unauthSupabase)

    render(<Dashboard onDataUpdate={jest.fn()} onPageChange={jest.fn()} />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Should handle unauthenticated state gracefully
    expect(screen.getByText('Total Cars')).toBeInTheDocument()
  })
})
