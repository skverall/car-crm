import { CurrencyType } from '@/lib/types/database'

// Default exchange rates (should be updated from API or database)
const DEFAULT_RATES: Record<string, number> = {
  'USD_AED': 3.67,
  'EUR_AED': 4.00,
  'GBP_AED': 4.60,
  'AED_USD': 0.27,
  'AED_EUR': 0.25,
  'AED_GBP': 0.22,
}

export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyType,
  toCurrency: CurrencyType = 'AED'
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const rateKey = `${fromCurrency}_${toCurrency}`
  const rate = DEFAULT_RATES[rateKey]
  
  if (!rate) {
    // If direct rate not available, convert through AED
    if (toCurrency === 'AED') {
      const toAedRate = DEFAULT_RATES[`${fromCurrency}_AED`]
      return toAedRate ? amount * toAedRate : amount
    } else if (fromCurrency === 'AED') {
      const fromAedRate = DEFAULT_RATES[`AED_${toCurrency}`]
      return fromAedRate ? amount * fromAedRate : amount
    } else {
      // Convert from -> AED -> to
      const toAedRate = DEFAULT_RATES[`${fromCurrency}_AED`]
      const fromAedRate = DEFAULT_RATES[`AED_${toCurrency}`]
      if (toAedRate && fromAedRate) {
        return amount * toAedRate * fromAedRate
      }
    }
  }

  return rate ? amount * rate : amount
}

export function formatCurrency(
  amount: number,
  currency: CurrencyType = 'AED',
  locale: string = 'en-AE'
): string {
  const currencySymbols: Record<CurrencyType, string> = {
    AED: 'AED',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencySymbols[currency],
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function getCurrencySymbol(currency: CurrencyType): string {
  const symbols: Record<CurrencyType, string> = {
    AED: 'د.إ',
    USD: '$',
    EUR: '€',
    GBP: '£',
  }
  return symbols[currency] || currency
}

export function getAllCurrencies(): CurrencyType[] {
  return ['AED', 'USD', 'EUR', 'GBP']
}

// Calculate profit in AED
export function calculateProfitInAED(
  salePrice: number,
  saleCurrency: CurrencyType,
  purchasePrice: number,
  purchaseCurrency: CurrencyType,
  totalExpenses: number = 0
): number {
  const salePriceAED = convertCurrency(salePrice, saleCurrency, 'AED')
  const purchasePriceAED = convertCurrency(purchasePrice, purchaseCurrency, 'AED')
  
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

// Calculate margin percentage
export function calculateMargin(
  profit: number,
  salePrice: number
): number {
  if (salePrice === 0) return 0
  return (profit / salePrice) * 100
}
