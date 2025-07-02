import { CurrencyType } from '@/lib/types/database'
import ExchangeRateService from '@/lib/services/exchangeRates'

/**
 * Centralized currency calculation utilities
 */

// Calculate profit in AED with async exchange rates
export async function calculateProfitInAEDAsync(
  salePrice: number,
  saleCurrency: CurrencyType,
  purchasePrice: number,
  purchaseCurrency: CurrencyType,
  totalExpenses: number = 0
): Promise<number> {
  const salePriceAED = await ExchangeRateService.convertCurrency(salePrice, saleCurrency, 'AED')
  const purchasePriceAED = await ExchangeRateService.convertCurrency(purchasePrice, purchaseCurrency, 'AED')
  
  return salePriceAED - purchasePriceAED - totalExpenses
}

// Calculate ROI percentage
export function calculateROI(
  profit: number,
  totalInvestment: number
): number {
  if (totalInvestment === 0) return 0
  return (profit / totalInvestment) * 100
}

// Calculate profit margin (profit / cost)
export function calculateProfitMargin(
  profit: number,
  totalCost: number
): number {
  if (totalCost === 0) return 0
  return (profit / totalCost) * 100
}

// Calculate total cost including expenses
export async function calculateTotalCostAsync(
  purchasePrice: number,
  purchaseCurrency: CurrencyType,
  expenses: Array<{ amount: number; currency: CurrencyType }>
): Promise<number> {
  const purchasePriceAED = await ExchangeRateService.convertCurrency(purchasePrice, purchaseCurrency, 'AED')
  
  let totalExpensesAED = 0
  for (const expense of expenses) {
    const expenseAED = await ExchangeRateService.convertCurrency(expense.amount, expense.currency, 'AED')
    totalExpensesAED += expenseAED
  }
  
  return purchasePriceAED + totalExpensesAED
}

// Batch convert multiple amounts
export async function batchConvertCurrency(
  conversions: Array<{
    amount: number
    from: CurrencyType
    to?: CurrencyType
  }>
): Promise<number[]> {
  const promises = conversions.map(({ amount, from, to = 'AED' }) =>
    ExchangeRateService.convertCurrency(amount, from, to)
  )
  
  return Promise.all(promises)
}

// Calculate inventory value in AED
export async function calculateInventoryValueAsync(
  cars: Array<{
    purchase_price: number
    purchase_currency: CurrencyType
    total_expenses_aed?: number
  }>
): Promise<number> {
  let totalValue = 0
  
  for (const car of cars) {
    const purchasePriceAED = await ExchangeRateService.convertCurrency(
      car.purchase_price,
      car.purchase_currency,
      'AED'
    )
    totalValue += purchasePriceAED + (car.total_expenses_aed || 0)
  }
  
  return totalValue
}

// Calculate average selling price
export async function calculateAverageSellingPriceAsync(
  soldCars: Array<{
    sale_price: number
    sale_currency: CurrencyType
  }>
): Promise<number> {
  if (soldCars.length === 0) return 0
  
  let totalSaleValueAED = 0
  
  for (const car of soldCars) {
    const salePriceAED = await ExchangeRateService.convertCurrency(
      car.sale_price,
      car.sale_currency,
      'AED'
    )
    totalSaleValueAED += salePriceAED
  }
  
  return totalSaleValueAED / soldCars.length
}

// Calculate monthly revenue
export async function calculateMonthlyRevenueAsync(
  soldCars: Array<{
    sale_price: number
    sale_currency: CurrencyType
    sale_date: string
  }>,
  year: number,
  month: number
): Promise<number> {
  const monthCars = soldCars.filter(car => {
    const saleDate = new Date(car.sale_date)
    return saleDate.getFullYear() === year && saleDate.getMonth() === month - 1
  })
  
  let totalRevenue = 0
  
  for (const car of monthCars) {
    const salePriceAED = await ExchangeRateService.convertCurrency(
      car.sale_price,
      car.sale_currency,
      'AED'
    )
    totalRevenue += salePriceAED
  }
  
  return totalRevenue
}

// Calculate currency distribution
export async function calculateCurrencyDistributionAsync(
  transactions: Array<{
    amount: number
    currency: CurrencyType
  }>
): Promise<Record<CurrencyType, { count: number; totalAED: number; percentage: number }>> {
  const distribution: Record<string, { count: number; totalAED: number }> = {}
  let grandTotalAED = 0
  
  // Calculate totals
  for (const transaction of transactions) {
    if (!distribution[transaction.currency]) {
      distribution[transaction.currency] = { count: 0, totalAED: 0 }
    }
    
    const amountAED = await ExchangeRateService.convertCurrency(
      transaction.amount,
      transaction.currency,
      'AED'
    )
    
    distribution[transaction.currency].count++
    distribution[transaction.currency].totalAED += amountAED
    grandTotalAED += amountAED
  }
  
  // Calculate percentages
  const result: Record<CurrencyType, { count: number; totalAED: number; percentage: number }> = {}
  
  Object.entries(distribution).forEach(([currency, data]) => {
    result[currency as CurrencyType] = {
      ...data,
      percentage: grandTotalAED > 0 ? (data.totalAED / grandTotalAED) * 100 : 0
    }
  })
  
  return result
}

// Validate currency amount
export function validateCurrencyAmount(amount: number, currency: CurrencyType): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (isNaN(amount) || !isFinite(amount)) {
    errors.push('Amount must be a valid number')
  }
  
  if (amount < 0) {
    errors.push('Amount cannot be negative')
  }
  
  if (amount > 999999999) {
    errors.push('Amount is too large')
  }
  
  if (!['AED', 'USD', 'EUR', 'GBP'].includes(currency)) {
    errors.push('Unsupported currency')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Format currency with proper locale
export function formatCurrencyAdvanced(
  amount: number,
  currency: CurrencyType,
  options: {
    locale?: string
    showSymbol?: boolean
    precision?: number
  } = {}
): string {
  const {
    locale = 'en-AE',
    showSymbol = true,
    precision = 2
  } = options
  
  if (!showSymbol) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(amount)
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(amount)
}

// Get currency symbol
export function getCurrencySymbol(currency: CurrencyType): string {
  const symbols: Record<CurrencyType, string> = {
    AED: 'د.إ',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }
  return symbols[currency] || currency
}

// Check if amount needs currency conversion warning
export function needsConversionWarning(
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType
): boolean {
  if (fromCurrency === toCurrency) return false
  
  // Warn for large amounts that might have significant conversion impact
  const thresholds: Record<CurrencyType, number> = {
    AED: 50000,
    USD: 15000,
    EUR: 12000,
    GBP: 10000
  }
  
  return amount >= (thresholds[fromCurrency] || 50000)
}
