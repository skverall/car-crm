import { convertCurrency, convertCurrencyAsync } from '../currency'
import ExchangeRateService from '@/lib/services/exchangeRates'

// Mock the exchange rate service
jest.mock('@/lib/services/exchangeRates')

describe('Currency Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('convertCurrency (synchronous)', () => {
    it('should return the same amount for same currency', () => {
      const result = convertCurrency(100, 'USD', 'USD')
      expect(result).toBe(100)
    })

    it('should convert USD to AED using fallback rates', () => {
      const result = convertCurrency(100, 'USD', 'AED')
      expect(result).toBe(367) // 100 * 3.67
    })

    it('should convert EUR to AED using fallback rates', () => {
      const result = convertCurrency(100, 'EUR', 'AED')
      expect(result).toBe(400) // 100 * 4.00
    })

    it('should convert GBP to AED using fallback rates', () => {
      const result = convertCurrency(100, 'GBP', 'AED')
      expect(result).toBe(460) // 100 * 4.60
    })

    it('should convert AED to USD using fallback rates', () => {
      const result = convertCurrency(100, 'AED', 'USD')
      expect(result).toBe(27) // 100 * 0.27
    })

    it('should convert AED to EUR using fallback rates', () => {
      const result = convertCurrency(100, 'AED', 'EUR')
      expect(result).toBe(25) // 100 * 0.25
    })

    it('should convert AED to GBP using fallback rates', () => {
      const result = convertCurrency(100, 'AED', 'GBP')
      expect(result).toBe(22) // 100 * 0.22
    })

    it('should handle cross-currency conversion through AED', () => {
      const result = convertCurrency(100, 'USD', 'EUR')
      // USD -> AED (100 * 3.67 = 367) -> EUR (367 * 0.25 = 91.75)
      expect(result).toBeCloseTo(91.75, 2)
    })

    it('should return original amount for unknown currency pairs', () => {
      const result = convertCurrency(100, 'JPY' as any, 'AED')
      expect(result).toBe(100)
    })

    it('should handle zero amounts', () => {
      const result = convertCurrency(0, 'USD', 'AED')
      expect(result).toBe(0)
    })

    it('should handle negative amounts', () => {
      const result = convertCurrency(-100, 'USD', 'AED')
      expect(result).toBe(-367)
    })
  })

  describe('convertCurrencyAsync (asynchronous)', () => {
    it('should use ExchangeRateService for conversion', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency.mockResolvedValue(367)

      const result = await convertCurrencyAsync(100, 'USD', 'AED')

      expect(mockConvertCurrency).toHaveBeenCalledWith(100, 'USD', 'AED')
      expect(result).toBe(367)
    })

    it('should handle same currency conversion', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency.mockResolvedValue(100)

      const result = await convertCurrencyAsync(100, 'USD', 'USD')

      expect(mockConvertCurrency).toHaveBeenCalledWith(100, 'USD', 'USD')
      expect(result).toBe(100)
    })

    it('should handle service errors gracefully', async () => {
      const mockConvertCurrency = jest.mocked(ExchangeRateService.convertCurrency)
      mockConvertCurrency.mockRejectedValue(new Error('Service unavailable'))

      await expect(convertCurrencyAsync(100, 'USD', 'AED')).rejects.toThrow('Service unavailable')
    })
  })

  describe('Edge cases', () => {
    it('should handle very large numbers', () => {
      const result = convertCurrency(1000000, 'USD', 'AED')
      expect(result).toBe(3670000)
    })

    it('should handle very small numbers', () => {
      const result = convertCurrency(0.01, 'USD', 'AED')
      expect(result).toBeCloseTo(0.0367, 4)
    })

    it('should handle decimal precision correctly', () => {
      const result = convertCurrency(123.45, 'USD', 'AED')
      expect(result).toBeCloseTo(453.0615, 4)
    })
  })

  describe('Performance', () => {
    it('should handle multiple conversions efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        convertCurrency(100, 'USD', 'AED')
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 1000 conversions in less than 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})
