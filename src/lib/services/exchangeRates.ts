import { CurrencyType } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

// Fallback rates in case API is unavailable
const FALLBACK_RATES: Record<string, number> = {
  'USD_AED': 3.67,
  'EUR_AED': 4.00,
  'GBP_AED': 4.60,
  'AED_USD': 0.27,
  'AED_EUR': 0.25,
  'AED_GBP': 0.22,
}

interface ExchangeRateCache {
  rates: Map<string, number>
  lastUpdate: Date | null
  isUpdating: boolean
}

class ExchangeRateService {
  private static cache: ExchangeRateCache = {
    rates: new Map(),
    lastUpdate: null,
    isUpdating: false
  }

  private static readonly CACHE_DURATION = 1000 * 60 * 60 // 1 hour
  private static readonly API_URL = 'https://api.exchangerate-api.com/v4/latest/AED'

  /**
   * Get exchange rate between two currencies
   */
  static async getRate(from: CurrencyType, to: CurrencyType): Promise<number> {
    if (from === to) return 1

    // Check if we need to update rates
    if (this.shouldUpdateRates() && !this.cache.isUpdating) {
      await this.updateRates()
    }

    const rateKey = `${from}_${to}`
    
    // Try to get from cache first
    let rate = this.cache.rates.get(rateKey)
    
    if (!rate) {
      // Try reverse rate
      const reverseKey = `${to}_${from}`
      const reverseRate = this.cache.rates.get(reverseKey)
      if (reverseRate) {
        rate = 1 / reverseRate
        this.cache.rates.set(rateKey, rate)
      }
    }

    // Fallback to hardcoded rates
    if (!rate) {
      rate = FALLBACK_RATES[rateKey]
      if (!rate && FALLBACK_RATES[`${to}_${from}`]) {
        rate = 1 / FALLBACK_RATES[`${to}_${from}`]
      }
    }

    return rate || 1
  }

  /**
   * Convert amount from one currency to another
   */
  static async convertCurrency(
    amount: number,
    from: CurrencyType,
    to: CurrencyType = 'AED'
  ): Promise<number> {
    const rate = await this.getRate(from, to)
    return amount * rate
  }

  /**
   * Check if rates need updating
   */
  private static shouldUpdateRates(): boolean {
    if (!this.cache.lastUpdate) return true
    
    const now = new Date()
    const timeSinceUpdate = now.getTime() - this.cache.lastUpdate.getTime()
    
    return timeSinceUpdate > this.CACHE_DURATION
  }

  /**
   * Update exchange rates from API and database
   */
  private static async updateRates(): Promise<void> {
    if (this.cache.isUpdating) return

    this.cache.isUpdating = true

    try {
      // Try to fetch from API first
      await this.fetchFromAPI()
    } catch (error) {
      console.warn('Failed to fetch rates from API, trying database:', error)
      
      try {
        // Fallback to database
        await this.fetchFromDatabase()
      } catch (dbError) {
        console.warn('Failed to fetch rates from database, using fallback rates:', dbError)
        this.loadFallbackRates()
      }
    } finally {
      this.cache.isUpdating = false
      this.cache.lastUpdate = new Date()
    }
  }

  /**
   * Fetch rates from external API
   */
  private static async fetchFromAPI(): Promise<void> {
    const response = await fetch(this.API_URL)
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const rates = data.rates

    if (!rates) {
      throw new Error('Invalid API response format')
    }

    // Convert API rates to our format (AED as base)
    this.cache.rates.clear()
    
    // Direct rates from AED
    Object.entries(rates).forEach(([currency, rate]) => {
      if (['USD', 'EUR', 'GBP'].includes(currency)) {
        this.cache.rates.set(`AED_${currency}`, rate as number)
        this.cache.rates.set(`${currency}_AED`, 1 / (rate as number))
      }
    })

    // Save to database for offline use
    await this.saveToDatabase()
  }

  /**
   * Fetch rates from database
   */
  private static async fetchFromDatabase(): Promise<void> {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .gte('created_at', new Date(Date.now() - this.CACHE_DURATION).toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    if (data && data.length > 0) {
      this.cache.rates.clear()
      data.forEach(rate => {
        const key = `${rate.from_currency}_${rate.to_currency}`
        this.cache.rates.set(key, rate.rate)
      })
    } else {
      throw new Error('No recent rates in database')
    }
  }

  /**
   * Save current rates to database
   */
  private static async saveToDatabase(): Promise<void> {
    const supabase = createClient()
    const now = new Date().toISOString()

    const ratesToSave = Array.from(this.cache.rates.entries()).map(([key, rate]) => {
      const [from, to] = key.split('_')
      return {
        from_currency: from as CurrencyType,
        to_currency: to as CurrencyType,
        rate,
        date: now
      }
    })

    if (ratesToSave.length > 0) {
      const { error } = await supabase
        .from('exchange_rates')
        .insert(ratesToSave)

      if (error) {
        console.warn('Failed to save rates to database:', error)
      }
    }
  }

  /**
   * Load fallback rates into cache
   */
  private static loadFallbackRates(): void {
    this.cache.rates.clear()
    Object.entries(FALLBACK_RATES).forEach(([key, rate]) => {
      this.cache.rates.set(key, rate)
    })
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): CurrencyType[] {
    return ['AED', 'USD', 'EUR', 'GBP']
  }

  /**
   * Get cache status for debugging
   */
  static getCacheStatus() {
    return {
      ratesCount: this.cache.rates.size,
      lastUpdate: this.cache.lastUpdate,
      isUpdating: this.cache.isUpdating,
      rates: Object.fromEntries(this.cache.rates)
    }
  }

  /**
   * Force refresh rates
   */
  static async forceRefresh(): Promise<void> {
    this.cache.lastUpdate = null
    await this.updateRates()
  }
}

export default ExchangeRateService

// Export convenience functions
export const getExchangeRate = ExchangeRateService.getRate.bind(ExchangeRateService)
export const convertCurrency = ExchangeRateService.convertCurrency.bind(ExchangeRateService)
export const forceRefreshRates = ExchangeRateService.forceRefresh.bind(ExchangeRateService)
