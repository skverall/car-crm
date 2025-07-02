# Testing Guide for Car CRM

This document outlines the testing strategy and guidelines for the Car CRM application.

## Testing Stack

- **Jest**: JavaScript testing framework
- **React Testing Library**: Testing utilities for React components
- **Jest DOM**: Custom Jest matchers for DOM elements
- **TypeScript**: Type checking for tests

## Test Structure

```
src/
├── components/
│   ├── __tests__/
│   │   └── Dashboard.test.tsx
│   └── Dashboard.tsx
├── lib/
│   └── utils/
│       ├── __tests__/
│       │   ├── currency.test.ts
│       │   ├── validation.test.ts
│       │   └── currencyHelpers.test.ts
│       ├── currency.ts
│       ├── validation.ts
│       └── currencyHelpers.ts
└── hooks/
    ├── __tests__/
    │   └── useCurrency.test.ts
    └── useCurrency.ts
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Type checking
npm run type-check
```

### Coverage Thresholds

The project maintains the following coverage thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Categories

### 1. Unit Tests

Test individual functions and utilities in isolation.

**Location**: `src/lib/utils/__tests__/`

**Examples**:
- Currency conversion functions
- Validation utilities
- Helper functions
- Calculation logic

### 2. Component Tests

Test React components with user interactions and state changes.

**Location**: `src/components/__tests__/`

**Examples**:
- Dashboard component rendering
- Modal interactions
- Form submissions
- Error handling

### 3. Integration Tests

Test component interactions with external services and APIs.

**Location**: `src/components/__tests__/` (marked with integration patterns)

**Examples**:
- API calls with Supabase
- Currency service integration
- End-to-end workflows

### 4. Hook Tests

Test custom React hooks behavior and state management.

**Location**: `src/hooks/__tests__/`

**Examples**:
- Currency conversion hooks
- Error handling hooks
- Performance monitoring hooks

## Testing Guidelines

### 1. Test Naming

```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should do something specific', () => {
      // Test implementation
    })
  })
})
```

### 2. Test Structure (AAA Pattern)

```typescript
it('should calculate profit correctly', () => {
  // Arrange
  const salePrice = 50000
  const purchasePrice = 40000
  const expenses = 2000

  // Act
  const profit = calculateProfit(salePrice, purchasePrice, expenses)

  // Assert
  expect(profit).toBe(8000)
})
```

### 3. Mocking Guidelines

#### Mock External Dependencies

```typescript
// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } }
      })
    }
  })
}))
```

#### Mock Heavy Computations

```typescript
// Mock performance hooks for faster tests
jest.mock('@/hooks/usePerformance', () => ({
  useOptimizedCalculation: jest.fn((data, fn) => fn(data))
}))
```

### 4. Testing Async Operations

```typescript
it('should handle async currency conversion', async () => {
  const mockConvert = jest.fn().mockResolvedValue(367)
  
  const result = await convertCurrencyAsync(100, 'USD', 'AED')
  
  expect(result).toBe(367)
  expect(mockConvert).toHaveBeenCalledWith(100, 'USD', 'AED')
})
```

### 5. Testing Error Scenarios

```typescript
it('should handle API errors gracefully', async () => {
  const mockFetch = jest.fn().mockRejectedValue(new Error('API Error'))
  
  await expect(fetchData()).rejects.toThrow('API Error')
})
```

### 6. Testing User Interactions

```typescript
it('should open modal when button is clicked', async () => {
  render(<Dashboard />)
  
  const addButton = screen.getByText(/add vehicle/i)
  fireEvent.click(addButton)
  
  expect(screen.getByTestId('add-car-modal')).toBeInTheDocument()
})
```

## Test Data Management

### 1. Mock Data

Create reusable mock data for consistent testing:

```typescript
const mockCarData = {
  id: '1',
  vin: '1HGBH41JXMN109186',
  make: 'Honda',
  model: 'Civic',
  year: 2020,
  status: 'for_sale',
  purchase_price: 15000,
  purchase_currency: 'USD'
}
```

### 2. Test Factories

Use factory functions for generating test data:

```typescript
const createMockCar = (overrides = {}) => ({
  ...mockCarData,
  ...overrides
})
```

## Performance Testing

### 1. Render Performance

```typescript
it('should render efficiently with large datasets', () => {
  const largeCarsArray = Array.from({ length: 1000 }, (_, i) => 
    createMockCar({ id: i.toString() })
  )
  
  const start = performance.now()
  render(<Dashboard cars={largeCarsArray} />)
  const end = performance.now()
  
  expect(end - start).toBeLessThan(100) // Should render in <100ms
})
```

### 2. Calculation Performance

```typescript
it('should handle multiple conversions efficiently', () => {
  const start = performance.now()
  
  for (let i = 0; i < 1000; i++) {
    convertCurrency(100, 'USD', 'AED')
  }
  
  const end = performance.now()
  expect(end - start).toBeLessThan(100)
})
```

## Debugging Tests

### 1. Debug Mode

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 2. Console Debugging

```typescript
it('should debug test data', () => {
  const result = calculateProfit(50000, 40000, 2000)
  console.log('Debug result:', result) // Use sparingly
  expect(result).toBe(8000)
})
```

### 3. Screen Debugging

```typescript
it('should debug component rendering', () => {
  render(<Dashboard />)
  screen.debug() // Prints current DOM state
})
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run type-check
```

## Best Practices

1. **Write tests first** for critical business logic
2. **Test behavior, not implementation** details
3. **Keep tests simple** and focused on one thing
4. **Use descriptive test names** that explain the scenario
5. **Mock external dependencies** to isolate units under test
6. **Test edge cases** and error scenarios
7. **Maintain test data** separate from test logic
8. **Run tests frequently** during development
9. **Keep tests fast** by avoiding unnecessary async operations
10. **Review test coverage** regularly but don't chase 100%

## Common Patterns

### Testing Forms

```typescript
it('should validate form input', async () => {
  render(<AddCarForm />)
  
  const vinInput = screen.getByLabelText(/vin/i)
  const submitButton = screen.getByText(/submit/i)
  
  fireEvent.change(vinInput, { target: { value: 'invalid-vin' } })
  fireEvent.click(submitButton)
  
  expect(screen.getByText(/invalid vin format/i)).toBeInTheDocument()
})
```

### Testing API Calls

```typescript
it('should fetch cars on mount', async () => {
  const mockFetch = jest.fn().mockResolvedValue({ data: [mockCarData] })
  
  render(<Dashboard />)
  
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalled()
  })
})
```

### Testing Calculations

```typescript
describe('profit calculations', () => {
  it.each([
    [50000, 40000, 2000, 8000],
    [30000, 25000, 1000, 4000],
    [100000, 80000, 5000, 15000]
  ])('should calculate profit for sale:%d, purchase:%d, expenses:%d = %d', 
    (sale, purchase, expenses, expected) => {
      expect(calculateProfit(sale, purchase, expenses)).toBe(expected)
    }
  )
})
```

This testing strategy ensures comprehensive coverage of the Car CRM application while maintaining fast, reliable, and maintainable tests.
