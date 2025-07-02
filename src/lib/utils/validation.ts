import { CurrencyType, CarStatus, ExpenseCategory, VehicleCondition } from '@/lib/types/database'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitized?: any
}

/**
 * Sanitize string input to prevent XSS and other attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

/**
 * Sanitize and validate VIN
 */
export function sanitizeVIN(vin: string): string {
  if (typeof vin !== 'string') return ''
  
  return vin
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, '') // Remove invalid VIN characters
    .substring(0, 17) // Limit to max VIN length
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required')
    return { isValid: false, errors, warnings }
  }
  
  const sanitized = sanitizeString(email).toLowerCase()
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format')
  }
  
  if (sanitized.length > 254) {
    errors.push('Email is too long')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!phone || typeof phone !== 'string') {
    return { isValid: true, errors, warnings, sanitized: null } // Phone is optional
  }
  
  const sanitized = phone.replace(/[^\d+\-\s()]/g, '').trim()
  
  if (sanitized.length < 7) {
    errors.push('Phone number is too short')
  }
  
  if (sanitized.length > 20) {
    errors.push('Phone number is too long')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Validate VIN
 */
export function validateVIN(vin: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!vin || typeof vin !== 'string') {
    errors.push('VIN is required')
    return { isValid: false, errors, warnings }
  }
  
  const sanitized = sanitizeVIN(vin)
  
  if (sanitized.length < 8) {
    errors.push('VIN is too short (minimum 8 characters)')
  }
  
  if (sanitized.length !== 17) {
    warnings.push('Non-standard VIN length (standard is 17 characters)')
  }
  
  // Check for invalid characters (I, O, Q not allowed in VINs)
  if (/[IOQ]/.test(sanitized)) {
    warnings.push('VIN contains characters that are typically not used (I, O, Q)')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Validate car data
 */
export function validateCarData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitized: any = {}
  
  // VIN validation
  const vinResult = validateVIN(data.vin)
  if (!vinResult.isValid) {
    errors.push(...vinResult.errors)
  }
  warnings.push(...vinResult.warnings)
  sanitized.vin = vinResult.sanitized
  
  // Make and Model
  if (!data.make || typeof data.make !== 'string' || data.make.trim().length === 0) {
    errors.push('Make is required')
  } else {
    sanitized.make = sanitizeString(data.make)
    if (sanitized.make.length < 2) {
      errors.push('Make must be at least 2 characters')
    }
  }
  
  if (!data.model || typeof data.model !== 'string' || data.model.trim().length === 0) {
    errors.push('Model is required')
  } else {
    sanitized.model = sanitizeString(data.model)
    if (sanitized.model.length < 1) {
      errors.push('Model must be at least 1 character')
    }
  }
  
  // Year validation
  const currentYear = new Date().getFullYear()
  const year = parseInt(data.year)
  if (isNaN(year) || year < 1900 || year > currentYear + 2) {
    errors.push(`Year must be between 1900 and ${currentYear + 2}`)
  } else {
    sanitized.year = year
  }
  
  // Price validation
  const purchasePrice = parseFloat(data.purchase_price)
  if (isNaN(purchasePrice) || purchasePrice <= 0) {
    errors.push('Purchase price must be a positive number')
  } else if (purchasePrice > 10000000) {
    warnings.push('Purchase price seems unusually high')
    sanitized.purchase_price = purchasePrice
  } else {
    sanitized.purchase_price = purchasePrice
  }
  
  // Currency validation
  if (!['AED', 'USD', 'EUR', 'GBP'].includes(data.purchase_currency)) {
    errors.push('Invalid purchase currency')
  } else {
    sanitized.purchase_currency = data.purchase_currency
  }
  
  // Status validation
  if (!['in_transit', 'for_sale', 'sold', 'reserved'].includes(data.status)) {
    errors.push('Invalid status')
  } else {
    sanitized.status = data.status
  }
  
  // Optional fields
  if (data.color) {
    sanitized.color = sanitizeString(data.color)
  }
  
  if (data.engine_size) {
    sanitized.engine_size = sanitizeString(data.engine_size)
  }
  
  if (data.mileage) {
    const mileage = parseInt(data.mileage)
    if (isNaN(mileage) || mileage < 0) {
      errors.push('Mileage must be a non-negative number')
    } else if (mileage > 1000000) {
      warnings.push('Mileage seems unusually high')
      sanitized.mileage = mileage
    } else {
      sanitized.mileage = mileage
    }
  }
  
  if (data.notes) {
    sanitized.notes = sanitizeString(data.notes)
  }
  
  if (data.location) {
    sanitized.location = sanitizeString(data.location)
  }
  
  if (data.dealer) {
    sanitized.dealer = sanitizeString(data.dealer)
  }
  
  // Date validation
  if (data.purchase_date) {
    const purchaseDate = new Date(data.purchase_date)
    if (isNaN(purchaseDate.getTime())) {
      errors.push('Invalid purchase date')
    } else if (purchaseDate > new Date()) {
      warnings.push('Purchase date is in the future')
      sanitized.purchase_date = data.purchase_date
    } else {
      sanitized.purchase_date = data.purchase_date
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Validate expense data
 */
export function validateExpenseData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitized: any = {}
  
  // Amount validation
  const amount = parseFloat(data.amount)
  if (isNaN(amount) || amount <= 0) {
    errors.push('Amount must be a positive number')
  } else if (amount > 1000000) {
    warnings.push('Amount seems unusually high')
    sanitized.amount = amount
  } else {
    sanitized.amount = amount
  }
  
  // Currency validation
  if (!['AED', 'USD', 'EUR', 'GBP'].includes(data.currency)) {
    errors.push('Invalid currency')
  } else {
    sanitized.currency = data.currency
  }
  
  // Category validation
  const validCategories: ExpenseCategory[] = [
    'purchase', 'transport', 'customs', 'repair', 'maintenance', 'marketing', 'office', 'other'
  ]
  if (!validCategories.includes(data.category)) {
    errors.push('Invalid expense category')
  } else {
    sanitized.category = data.category
  }
  
  // Description validation
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required')
  } else {
    sanitized.description = sanitizeString(data.description)
    if (sanitized.description.length < 3) {
      errors.push('Description must be at least 3 characters')
    }
  }
  
  // Date validation
  if (data.expense_date) {
    const expenseDate = new Date(data.expense_date)
    if (isNaN(expenseDate.getTime())) {
      errors.push('Invalid expense date')
    } else if (expenseDate > new Date()) {
      warnings.push('Expense date is in the future')
      sanitized.expense_date = data.expense_date
    } else {
      sanitized.expense_date = data.expense_date
    }
  }
  
  // Optional fields
  if (data.notes) {
    sanitized.notes = sanitizeString(data.notes)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Validate market price data
 */
export function validateMarketPriceData(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sanitized: any = {}
  
  // Make and Model validation (same as car)
  if (!data.make || typeof data.make !== 'string' || data.make.trim().length === 0) {
    errors.push('Make is required')
  } else {
    sanitized.make = sanitizeString(data.make)
  }
  
  if (!data.model || typeof data.model !== 'string' || data.model.trim().length === 0) {
    errors.push('Model is required')
  } else {
    sanitized.model = sanitizeString(data.model)
  }
  
  // Year validation
  const currentYear = new Date().getFullYear()
  const year = parseInt(data.year)
  if (isNaN(year) || year < 1900 || year > currentYear + 2) {
    errors.push(`Year must be between 1900 and ${currentYear + 2}`)
  } else {
    sanitized.year = year
  }
  
  // Price validation
  const marketPrice = parseFloat(data.market_price)
  if (isNaN(marketPrice) || marketPrice <= 0) {
    errors.push('Market price must be a positive number')
  } else {
    sanitized.market_price = marketPrice
  }
  
  // Currency validation
  if (!['AED', 'USD', 'EUR', 'GBP'].includes(data.currency)) {
    errors.push('Invalid currency')
  } else {
    sanitized.currency = data.currency
  }
  
  // Condition validation
  const validConditions: VehicleCondition[] = ['excellent', 'good', 'fair', 'poor']
  if (!validConditions.includes(data.condition)) {
    errors.push('Invalid vehicle condition')
  } else {
    sanitized.condition = data.condition
  }
  
  // Optional mileage
  if (data.mileage) {
    const mileage = parseInt(data.mileage)
    if (isNaN(mileage) || mileage < 0) {
      errors.push('Mileage must be a non-negative number')
    } else {
      sanitized.mileage = mileage
    }
  }
  
  // Optional fields
  if (data.source) {
    sanitized.source = sanitizeString(data.source)
  }
  
  if (data.notes) {
    sanitized.notes = sanitizeString(data.notes)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map()
  
  static isAllowed(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.requests.has(key)) {
      this.requests.set(key, [])
    }
    
    const userRequests = this.requests.get(key)!
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart)
    
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }
  
  static getRemainingRequests(key: string, maxRequests: number = 10, windowMs: number = 60000): number {
    const now = Date.now()
    const windowStart = now - windowMs
    
    if (!this.requests.has(key)) {
      return maxRequests
    }
    
    const userRequests = this.requests.get(key)!
    const validRequests = userRequests.filter(time => time > windowStart)
    
    return Math.max(0, maxRequests - validRequests.length)
  }
}
