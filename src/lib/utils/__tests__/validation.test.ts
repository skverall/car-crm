import {
  sanitizeString,
  sanitizeVIN,
  validateEmail,
  validatePhone,
  validateVIN,
  validateCarData,
  validateExpenseData,
  RateLimiter
} from '../validation'

describe('Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      const result = sanitizeString('<script>alert("xss")</script>Hello')
      expect(result).toBe('alert("xss")Hello')
    })

    it('should remove javascript protocols', () => {
      const result = sanitizeString('javascript:alert("xss")')
      expect(result).toBe('alert("xss")')
    })

    it('should remove event handlers', () => {
      const result = sanitizeString('onclick=alert("xss") Hello')
      expect(result).toBe('Hello')
    })

    it('should trim whitespace', () => {
      const result = sanitizeString('  Hello World  ')
      expect(result).toBe('Hello World')
    })

    it('should limit length to 1000 characters', () => {
      const longString = 'a'.repeat(1500)
      const result = sanitizeString(longString)
      expect(result.length).toBe(1000)
    })

    it('should handle non-string input', () => {
      const result = sanitizeString(123 as any)
      expect(result).toBe('')
    })
  })

  describe('sanitizeVIN', () => {
    it('should convert to uppercase', () => {
      const result = sanitizeVIN('abc123def456')
      expect(result).toBe('ABC123DEF456')
    })

    it('should remove invalid VIN characters', () => {
      const result = sanitizeVIN('ABC123-DEF456!')
      expect(result).toBe('ABC123DEF456')
    })

    it('should limit to 17 characters', () => {
      const result = sanitizeVIN('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      expect(result.length).toBe(17)
    })

    it('should handle non-string input', () => {
      const result = sanitizeVIN(123 as any)
      expect(result).toBe('')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email format', () => {
      const result = validateEmail('test@example.com')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe('test@example.com')
    })

    it('should reject invalid email format', () => {
      const result = validateEmail('invalid-email')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid email format')
    })

    it('should reject empty email', () => {
      const result = validateEmail('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Email is required')
    })

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = validateEmail(longEmail)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Email is too long')
    })

    it('should convert email to lowercase', () => {
      const result = validateEmail('TEST@EXAMPLE.COM')
      expect(result.sanitized).toBe('test@example.com')
    })
  })

  describe('validatePhone', () => {
    it('should validate correct phone number', () => {
      const result = validatePhone('+1234567890')
      expect(result.isValid).toBe(true)
    })

    it('should allow empty phone (optional field)', () => {
      const result = validatePhone('')
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBe(null)
    })

    it('should reject phone that is too short', () => {
      const result = validatePhone('123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Phone number is too short')
    })

    it('should reject phone that is too long', () => {
      const result = validatePhone('1'.repeat(25))
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Phone number is too long')
    })

    it('should sanitize phone number', () => {
      const result = validatePhone('+1 (234) 567-8900 ext 123')
      expect(result.sanitized).toBe('+1 (234) 567-8900')
    })
  })

  describe('validateVIN', () => {
    it('should validate standard 17-character VIN', () => {
      const result = validateVIN('1HGBH41JXMN109186')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should warn about non-standard VIN length', () => {
      const result = validateVIN('ABC123DEF')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Non-standard VIN length (standard is 17 characters)')
    })

    it('should reject VIN that is too short', () => {
      const result = validateVIN('ABC123')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('VIN is too short (minimum 8 characters)')
    })

    it('should warn about invalid VIN characters', () => {
      const result = validateVIN('1HGBH41JXMN109I8O')
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('VIN contains characters that are typically not used (I, O, Q)')
    })

    it('should reject empty VIN', () => {
      const result = validateVIN('')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('VIN is required')
    })
  })

  describe('validateCarData', () => {
    const validCarData = {
      vin: '1HGBH41JXMN109186',
      make: 'Honda',
      model: 'Civic',
      year: 2020,
      purchase_price: 15000,
      purchase_currency: 'USD',
      status: 'for_sale'
    }

    it('should validate correct car data', () => {
      const result = validateCarData(validCarData)
      expect(result.isValid).toBe(true)
      expect(result.sanitized.make).toBe('Honda')
      expect(result.sanitized.model).toBe('Civic')
    })

    it('should reject missing required fields', () => {
      const result = validateCarData({ ...validCarData, make: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Make is required')
    })

    it('should reject invalid year', () => {
      const result = validateCarData({ ...validCarData, year: 1800 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Year must be between 1900 and 2027')
    })

    it('should reject negative purchase price', () => {
      const result = validateCarData({ ...validCarData, purchase_price: -1000 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Purchase price must be a positive number')
    })

    it('should warn about unusually high purchase price', () => {
      const result = validateCarData({ ...validCarData, purchase_price: 15000000 })
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Purchase price seems unusually high')
    })

    it('should reject invalid currency', () => {
      const result = validateCarData({ ...validCarData, purchase_currency: 'JPY' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid purchase currency')
    })

    it('should reject invalid status', () => {
      const result = validateCarData({ ...validCarData, status: 'invalid_status' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid status')
    })

    it('should validate optional mileage', () => {
      const result = validateCarData({ ...validCarData, mileage: 50000 })
      expect(result.isValid).toBe(true)
      expect(result.sanitized.mileage).toBe(50000)
    })

    it('should reject negative mileage', () => {
      const result = validateCarData({ ...validCarData, mileage: -1000 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Mileage must be a non-negative number')
    })

    it('should warn about unusually high mileage', () => {
      const result = validateCarData({ ...validCarData, mileage: 1500000 })
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Mileage seems unusually high')
    })
  })

  describe('validateExpenseData', () => {
    const validExpenseData = {
      amount: 500,
      currency: 'USD',
      category: 'repair',
      description: 'Engine repair'
    }

    it('should validate correct expense data', () => {
      const result = validateExpenseData(validExpenseData)
      expect(result.isValid).toBe(true)
      expect(result.sanitized.amount).toBe(500)
    })

    it('should reject negative amount', () => {
      const result = validateExpenseData({ ...validExpenseData, amount: -100 })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Amount must be a positive number')
    })

    it('should warn about unusually high amount', () => {
      const result = validateExpenseData({ ...validExpenseData, amount: 1500000 })
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Amount seems unusually high')
    })

    it('should reject invalid currency', () => {
      const result = validateExpenseData({ ...validExpenseData, currency: 'JPY' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid currency')
    })

    it('should reject invalid category', () => {
      const result = validateExpenseData({ ...validExpenseData, category: 'invalid' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid expense category')
    })

    it('should reject short description', () => {
      const result = validateExpenseData({ ...validExpenseData, description: 'Hi' })
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Description must be at least 3 characters')
    })
  })

  describe('RateLimiter', () => {
    beforeEach(() => {
      // Clear the rate limiter state
      RateLimiter['requests'].clear()
    })

    it('should allow requests within limit', () => {
      expect(RateLimiter.isAllowed('test-key', 5, 60000)).toBe(true)
      expect(RateLimiter.isAllowed('test-key', 5, 60000)).toBe(true)
      expect(RateLimiter.isAllowed('test-key', 5, 60000)).toBe(true)
    })

    it('should block requests exceeding limit', () => {
      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        expect(RateLimiter.isAllowed('test-key', 5, 60000)).toBe(true)
      }
      
      // 6th request should be blocked
      expect(RateLimiter.isAllowed('test-key', 5, 60000)).toBe(false)
    })

    it('should track remaining requests correctly', () => {
      expect(RateLimiter.getRemainingRequests('test-key', 5, 60000)).toBe(5)
      
      RateLimiter.isAllowed('test-key', 5, 60000)
      expect(RateLimiter.getRemainingRequests('test-key', 5, 60000)).toBe(4)
      
      RateLimiter.isAllowed('test-key', 5, 60000)
      expect(RateLimiter.getRemainingRequests('test-key', 5, 60000)).toBe(3)
    })

    it('should handle different keys independently', () => {
      expect(RateLimiter.isAllowed('key1', 2, 60000)).toBe(true)
      expect(RateLimiter.isAllowed('key2', 2, 60000)).toBe(true)
      expect(RateLimiter.isAllowed('key1', 2, 60000)).toBe(true)
      expect(RateLimiter.isAllowed('key2', 2, 60000)).toBe(true)
      
      // Both keys should now be at limit
      expect(RateLimiter.isAllowed('key1', 2, 60000)).toBe(false)
      expect(RateLimiter.isAllowed('key2', 2, 60000)).toBe(false)
    })
  })
})
