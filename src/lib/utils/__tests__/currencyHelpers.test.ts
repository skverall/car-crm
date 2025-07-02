import {
  calculateProfitInAEDAsync,
  calculateROI,
  calculateProfitMargin,
  calculateTotalCostAsync,
  validateCurrencyAmount,
  formatCurrencyAdvanced,
  getCurrencySymbol,
  needsConversionWarning
} from '../currencyHelpers'
import ExchangeRateService from '@/lib/services/exchangeRates'

// Mock the exchange rate service
jest.mock('@/lib/services/exchangeRates')

describe('Currency Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateProfitInAEDAsync', () => {
    it('should calculate profit correctly with same currency', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency
        .mockResolvedValueOnce(50000) // sale price in AED
        .mockResolvedValueOnce(40000) // purchase price in AED

      const profit = await calculateProfitInAEDAsync(50000, 'AED', 40000, 'AED', 2000)
      
      expect(profit).toBe(8000) // 50000 - 40000 - 2000
    })

    it('should calculate profit correctly with different currencies', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency
        .mockResolvedValueOnce(183500) // $50,000 to AED
        .mockResolvedValueOnce(146800) // $40,000 to AED

      const profit = await calculateProfitInAEDAsync(50000, 'USD', 40000, 'USD', 2000)
      
      expect(profit).toBe(34700) // 183500 - 146800 - 2000
    })

    it('should handle zero expenses', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency
        .mockResolvedValueOnce(50000)
        .mockResolvedValueOnce(40000)

      const profit = await calculateProfitInAEDAsync(50000, 'AED', 40000, 'AED')
      
      expect(profit).toBe(10000)
    })
  })

  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      const roi = calculateROI(10000, 40000)
      expect(roi).toBe(25) // (10000 / 40000) * 100
    })

    it('should handle zero investment', () => {
      const roi = calculateROI(10000, 0)
      expect(roi).toBe(0)
    })

    it('should handle negative profit', () => {
      const roi = calculateROI(-5000, 40000)
      expect(roi).toBe(-12.5)
    })
  })

  describe('calculateProfitMargin', () => {
    it('should calculate profit margin correctly', () => {
      const margin = calculateProfitMargin(10000, 40000)
      expect(margin).toBe(25) // (10000 / 40000) * 100
    })

    it('should handle zero cost', () => {
      const margin = calculateProfitMargin(10000, 0)
      expect(margin).toBe(0)
    })

    it('should handle negative profit', () => {
      const margin = calculateProfitMargin(-5000, 40000)
      expect(margin).toBe(-12.5)
    })
  })

  describe('calculateTotalCostAsync', () => {
    it('should calculate total cost with expenses', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency
        .mockResolvedValueOnce(146800) // purchase price to AED
        .mockResolvedValueOnce(1835) // expense 1 to AED
        .mockResolvedValueOnce(3670) // expense 2 to AED

      const expenses = [
        { amount: 500, currency: 'USD' as const },
        { amount: 1000, currency: 'USD' as const }
      ]

      const totalCost = await calculateTotalCostAsync(40000, 'USD', expenses)
      
      expect(totalCost).toBe(152305) // 146800 + 1835 + 3670
    })

    it('should handle no expenses', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency.mockResolvedValueOnce(146800)

      const totalCost = await calculateTotalCostAsync(40000, 'USD', [])
      
      expect(totalCost).toBe(146800)
    })
  })

  describe('validateCurrencyAmount', () => {
    it('should validate correct amount and currency', () => {
      const result = validateCurrencyAmount(1000, 'USD')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject negative amount', () => {
      const result = validateCurrencyAmount(-100, 'USD')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount cannot be negative')
    })

    it('should reject NaN amount', () => {
      const result = validateCurrencyAmount(NaN, 'USD')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount must be a valid number')
    })

    it('should reject infinite amount', () => {
      const result = validateCurrencyAmount(Infinity, 'USD')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount must be a valid number')
    })

    it('should reject amount that is too large', () => {
      const result = validateCurrencyAmount(1000000000, 'USD')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount is too large')
    })

    it('should reject unsupported currency', () => {
      const result = validateCurrencyAmount(1000, 'JPY' as any)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unsupported currency')
    })
  })

  describe('formatCurrencyAdvanced', () => {
    it('should format currency with symbol', () => {
      const result = formatCurrencyAdvanced(1234.56, 'USD')
      expect(result).toMatch(/\$1,234\.56/)
    })

    it('should format currency without symbol', () => {
      const result = formatCurrencyAdvanced(1234.56, 'USD', { showSymbol: false })
      expect(result).toBe('1,234.56')
    })

    it('should format with custom precision', () => {
      const result = formatCurrencyAdvanced(1234.5678, 'USD', { precision: 4 })
      expect(result).toMatch(/\$1,234\.5678/)
    })

    it('should handle different locales', () => {
      const result = formatCurrencyAdvanced(1234.56, 'EUR', { locale: 'de-DE' })
      expect(result).toMatch(/1\.234,56/)
    })
  })

  describe('getCurrencySymbol', () => {
    it('should return correct symbols for supported currencies', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
      expect(getCurrencySymbol('EUR')).toBe('€')
      expect(getCurrencySymbol('GBP')).toBe('£')
      expect(getCurrencySymbol('AED')).toBe('د.إ')
    })

    it('should return currency code for unsupported currencies', () => {
      expect(getCurrencySymbol('JPY' as any)).toBe('JPY')
    })
  })

  describe('needsConversionWarning', () => {
    it('should not warn for same currency', () => {
      const result = needsConversionWarning(100000, 'USD', 'USD')
      expect(result).toBe(false)
    })

    it('should warn for large USD amounts', () => {
      const result = needsConversionWarning(20000, 'USD', 'AED')
      expect(result).toBe(true)
    })

    it('should not warn for small USD amounts', () => {
      const result = needsConversionWarning(10000, 'USD', 'AED')
      expect(result).toBe(false)
    })

    it('should warn for large EUR amounts', () => {
      const result = needsConversionWarning(15000, 'EUR', 'AED')
      expect(result).toBe(true)
    })

    it('should warn for large GBP amounts', () => {
      const result = needsConversionWarning(12000, 'GBP', 'AED')
      expect(result).toBe(true)
    })

    it('should warn for large AED amounts', () => {
      const result = needsConversionWarning(60000, 'AED', 'USD')
      expect(result).toBe(true)
    })

    it('should use default threshold for unknown currencies', () => {
      const result = needsConversionWarning(60000, 'JPY' as any, 'USD')
      expect(result).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle service errors in async functions', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency.mockRejectedValue(new Error('Service unavailable'))

      await expect(calculateProfitInAEDAsync(50000, 'USD', 40000, 'USD'))
        .rejects.toThrow('Service unavailable')
    })

    it('should handle zero amounts in calculations', () => {
      expect(calculateROI(0, 1000)).toBe(0)
      expect(calculateProfitMargin(0, 1000)).toBe(0)
    })

    it('should handle very small numbers in formatting', () => {
      const result = formatCurrencyAdvanced(0.01, 'USD')
      expect(result).toMatch(/\$0\.01/)
    })

    it('should handle very large numbers in formatting', () => {
      const result = formatCurrencyAdvanced(1234567890.12, 'USD')
      expect(result).toMatch(/\$1,234,567,890\.12/)
    })
  })
})
