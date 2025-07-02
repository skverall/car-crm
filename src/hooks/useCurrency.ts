import { useState, useEffect, useCallback } from 'react'
import { CurrencyType } from '@/lib/types/database'
import ExchangeRateService from '@/lib/services/exchangeRates'

interface UseCurrencyReturn {
  convertCurrency: (amount: number, from: CurrencyType, to?: CurrencyType) => Promise<number>
  getExchangeRate: (from: CurrencyType, to: CurrencyType) => Promise<number>
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  forceRefresh: () => Promise<void>
  cacheStatus: any
}

export function useCurrency(): UseCurrencyReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const convertCurrency = useCallback(async (
    amount: number,
    from: CurrencyType,
    to: CurrencyType = 'AED'
  ): Promise<number> => {
    try {
      setError(null)
      return await ExchangeRateService.convertCurrency(amount, from, to)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Currency conversion failed'
      setError(errorMessage)
      console.error('Currency conversion error:', err)
      
      // Fallback to synchronous conversion
      const fallbackRates: Record<string, number> = {
        'USD_AED': 3.67,
        'EUR_AED': 4.00,
        'GBP_AED': 4.60,
        'AED_USD': 0.27,
        'AED_EUR': 0.25,
        'AED_GBP': 0.22,
      }
      
      if (from === to) return amount
      
      const rateKey = `${from}_${to}`
      const rate = fallbackRates[rateKey] || 1
      return amount * rate
    }
  }, [])

  const getExchangeRate = useCallback(async (
    from: CurrencyType,
    to: CurrencyType
  ): Promise<number> => {
    try {
      setError(null)
      return await ExchangeRateService.getRate(from, to)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get exchange rate'
      setError(errorMessage)
      console.error('Exchange rate error:', err)
      return 1
    }
  }, [])

  const forceRefresh = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)
      await ExchangeRateService.forceRefresh()
      setLastUpdate(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh rates'
      setError(errorMessage)
      console.error('Force refresh error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCacheStatus = useCallback(() => {
    return ExchangeRateService.getCacheStatus()
  }, [])

  // Initialize exchange rates on mount
  useEffect(() => {
    const initializeRates = async () => {
      try {
        setIsLoading(true)
        // Trigger initial rate fetch
        await ExchangeRateService.getRate('USD', 'AED')
        const status = ExchangeRateService.getCacheStatus()
        setLastUpdate(status.lastUpdate)
      } catch (err) {
        console.warn('Failed to initialize exchange rates:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeRates()
  }, [])

  return {
    convertCurrency,
    getExchangeRate,
    isLoading,
    error,
    lastUpdate,
    forceRefresh,
    cacheStatus: getCacheStatus()
  }
}

// Utility hook for batch currency conversions
export function useBatchCurrencyConversion() {
  const { convertCurrency } = useCurrency()

  const convertBatch = useCallback(async (
    conversions: Array<{
      amount: number
      from: CurrencyType
      to?: CurrencyType
      id?: string
    }>
  ) => {
    const results = await Promise.allSettled(
      conversions.map(async (conversion) => ({
        id: conversion.id,
        amount: conversion.amount,
        from: conversion.from,
        to: conversion.to || 'AED',
        result: await convertCurrency(conversion.amount, conversion.from, conversion.to)
      }))
    )

    return results.map((result, index) => ({
      ...conversions[index],
      success: result.status === 'fulfilled',
      convertedAmount: result.status === 'fulfilled' ? result.value.result : 0,
      error: result.status === 'rejected' ? result.reason : null
    }))
  }, [convertCurrency])

  return { convertBatch }
}

// Hook for real-time currency display
export function useCurrencyDisplay(
  amount: number,
  currency: CurrencyType,
  targetCurrency: CurrencyType = 'AED'
) {
  const [convertedAmount, setConvertedAmount] = useState<number>(amount)
  const [isConverting, setIsConverting] = useState(false)
  const { convertCurrency } = useCurrency()

  useEffect(() => {
    if (currency === targetCurrency) {
      setConvertedAmount(amount)
      return
    }

    const convert = async () => {
      setIsConverting(true)
      try {
        const result = await convertCurrency(amount, currency, targetCurrency)
        setConvertedAmount(result)
      } catch (error) {
        console.error('Currency display conversion error:', error)
        setConvertedAmount(amount) // Fallback to original amount
      } finally {
        setIsConverting(false)
      }
    }

    convert()
  }, [amount, currency, targetCurrency, convertCurrency])

  return {
    convertedAmount,
    isConverting,
    originalAmount: amount,
    originalCurrency: currency,
    targetCurrency
  }
}
