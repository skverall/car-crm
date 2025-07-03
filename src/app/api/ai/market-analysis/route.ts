import { NextRequest, NextResponse } from 'next/server'

interface MarketAnalysisRequest {
  make: string
  model: string
  year: number
  mileage?: number
  condition?: string
}

interface MarketAnalysisResponse {
  minimum_price: string
  average_price: string
  maximum_price: string
  resale_speed: string
  recommended_auction_price: string
  verdict: string
  analysis_date: string
}

export async function POST(request: NextRequest) {
  try {
    const body: MarketAnalysisRequest = await request.json()
    
    if (!body.make || !body.model || !body.year) {
      return NextResponse.json(
        { error: 'Make, model, and year are required' },
        { status: 400 }
      )
    }

    // Simulate AI analysis with realistic data for Dubai market
    const analysis = await generateMarketAnalysis(body)
    
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error in market analysis:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function generateMarketAnalysis(vehicle: MarketAnalysisRequest): Promise<MarketAnalysisResponse> {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // Generate realistic price ranges based on vehicle data
  const basePrice = calculateBasePrice(vehicle)
  const priceVariation = basePrice * 0.3 // 30% variation
  
  const minPrice = Math.round(basePrice - priceVariation)
  const maxPrice = Math.round(basePrice + priceVariation)
  const avgPrice = Math.round(basePrice)
  const recommendedPrice = Math.round(basePrice * 0.75) // 75% of average for profitable resale
  
  // Determine resale speed based on vehicle characteristics
  const resaleSpeed = determineResaleSpeed(vehicle)
  
  // Generate verdict
  const verdict = generateVerdict(vehicle, recommendedPrice, avgPrice)
  
  return {
    minimum_price: `AED ${minPrice.toLocaleString()}`,
    average_price: `AED ${avgPrice.toLocaleString()}`,
    maximum_price: `AED ${maxPrice.toLocaleString()}`,
    resale_speed: resaleSpeed,
    recommended_auction_price: `AED ${recommendedPrice.toLocaleString()}`,
    verdict: verdict,
    analysis_date: new Date().toISOString().split('T')[0]
  }
}

function calculateBasePrice(vehicle: MarketAnalysisRequest): number {
  const currentYear = new Date().getFullYear()
  const age = currentYear - vehicle.year
  
  // Base prices for different makes (in AED)
  const basePrices: { [key: string]: number } = {
    'toyota': 80000,
    'honda': 75000,
    'nissan': 70000,
    'hyundai': 65000,
    'kia': 60000,
    'ford': 85000,
    'chevrolet': 80000,
    'bmw': 150000,
    'mercedes': 160000,
    'audi': 140000,
    'lexus': 120000,
    'infiniti': 110000,
    'land rover': 200000,
    'porsche': 300000,
    'ferrari': 800000,
    'lamborghini': 900000
  }
  
  const makeKey = vehicle.make.toLowerCase()
  let basePrice = basePrices[makeKey] || 70000
  
  // Adjust for age
  const depreciationRate = 0.12 // 12% per year
  basePrice = basePrice * Math.pow(1 - depreciationRate, age)
  
  // Adjust for mileage
  if (vehicle.mileage) {
    const mileageFactor = Math.max(0.5, 1 - (vehicle.mileage / 200000) * 0.3)
    basePrice = basePrice * mileageFactor
  }
  
  // Adjust for condition
  const conditionMultipliers: { [key: string]: number } = {
    'excellent': 1.1,
    'good': 1.0,
    'fair': 0.85,
    'poor': 0.7
  }
  
  if (vehicle.condition) {
    basePrice = basePrice * (conditionMultipliers[vehicle.condition.toLowerCase()] || 1.0)
  }
  
  return Math.max(basePrice, 15000) // Minimum price
}

function determineResaleSpeed(vehicle: MarketAnalysisRequest): string {
  const popularMakes = ['toyota', 'honda', 'nissan', 'hyundai', 'kia']
  const luxuryMakes = ['bmw', 'mercedes', 'audi', 'lexus']
  const supercarMakes = ['ferrari', 'lamborghini', 'porsche']
  
  const makeKey = vehicle.make.toLowerCase()
  const age = new Date().getFullYear() - vehicle.year
  
  if (supercarMakes.includes(makeKey)) {
    return 'Slow (3-6 months) - Niche market, limited buyers'
  } else if (luxuryMakes.includes(makeKey)) {
    if (age < 5) {
      return 'Medium (1-3 months) - Good demand for newer luxury cars'
    } else {
      return 'Slow (2-4 months) - Higher maintenance concerns'
    }
  } else if (popularMakes.includes(makeKey)) {
    if (age < 8) {
      return 'Fast (2-6 weeks) - High demand, reliable reputation'
    } else {
      return 'Medium (1-2 months) - Still popular but older'
    }
  } else {
    return 'Medium (1-3 months) - Average market demand'
  }
}

function generateVerdict(vehicle: MarketAnalysisRequest, recommendedPrice: number, avgPrice: number): string {
  const profitMargin = (avgPrice - recommendedPrice) / recommendedPrice
  const age = new Date().getFullYear() - vehicle.year
  
  if (profitMargin > 0.4) {
    return '✅ STRONG BUY - Excellent profit potential, high demand expected'
  } else if (profitMargin > 0.25) {
    return '✅ BUY - Good profit margin, recommended purchase'
  } else if (profitMargin > 0.15) {
    return '⚠️ CONSIDER - Moderate profit, evaluate competition carefully'
  } else if (age > 10) {
    return '❌ SKIP - Too old, limited profit potential and higher risks'
  } else {
    return '❌ SKIP - Low profit margin, not recommended at this price'
  }
}
