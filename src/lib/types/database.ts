export type CarStatus = 'in_transit' | 'for_sale' | 'sold' | 'reserved'
export type ExpenseCategory = 'purchase' | 'transport' | 'customs' | 'repair' | 'maintenance' | 'marketing' | 'office' | 'other'
export type CurrencyType = 'AED' | 'USD' | 'EUR' | 'GBP'
export type UserRole = 'importer' | 'exporter'
export type PaymentMethod = 'cash' | 'bank_card'

export interface Client {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Car {
  id: string
  user_id: string
  vin: string
  make: string
  model: string
  year: number
  color?: string
  engine_size?: string
  fuel_type?: string
  transmission?: string
  mileage?: number

  // Purchase information
  purchase_price: number
  purchase_currency: CurrencyType
  purchase_date: string
  purchase_location?: string
  dealer?: string

  // Sale information
  sale_price?: number
  sale_currency?: CurrencyType
  sale_date?: string
  client_id?: string
  payment_method?: PaymentMethod
  payment_method?: PaymentMethod

  // Status and tracking
  status: CarStatus
  location?: string
  notes?: string

  // Metadata
  created_at: string
  updated_at: string

  // Relations
  client?: Client
  expenses?: Expense[]
  documents?: Document[]
}

export interface Expense {
  id: string
  user_id: string
  car_id: string | null
  category: ExpenseCategory
  description: string
  amount: number
  currency: CurrencyType
  expense_date: string
  receipt_url?: string
  notes?: string
  created_at: string
  updated_at: string

  // Relations
  car?: Car
}

export interface Document {
  id: string
  user_id: string
  car_id: string
  name: string
  type: string
  file_url: string
  file_size?: number
  mime_type?: string
  uploaded_at: string

  // Relations
  car?: Car
}

export interface ExchangeRate {
  id: string
  from_currency: CurrencyType
  to_currency: CurrencyType
  rate: number
  date: string
  created_at: string
}

export interface CarProfitAnalysis {
  id: string
  user_id: string
  vin: string
  make: string
  model: string
  year: number
  status: CarStatus
  dealer?: string
  purchase_price: number
  purchase_currency: CurrencyType
  sale_price?: number
  sale_currency?: CurrencyType
  total_expenses_aed: number
  profit_aed?: number
  purchase_date: string
  sale_date?: string
  days_to_sell?: number
}

export interface UserProfile {
  id: string
  role: UserRole
  full_name?: string
  company_name?: string
  phone?: string
  created_at: string
  updated_at: string
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      cars: {
        Row: Car
        Insert: Omit<Car, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Car, 'id' | 'created_at' | 'updated_at'>>
      }
      clients: {
        Row: Client
        Insert: Omit<Client, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>
      }
      expenses: {
        Row: Expense
        Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Expense, 'id' | 'created_at' | 'updated_at'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'uploaded_at'>
        Update: Partial<Omit<Document, 'id' | 'uploaded_at'>>
      }
      exchange_rates: {
        Row: ExchangeRate
        Insert: Omit<ExchangeRate, 'id' | 'created_at'>
        Update: Partial<Omit<ExchangeRate, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: {
      car_profit_analysis: {
        Row: CarProfitAnalysis
      }
    }
    Functions: {}
    Enums: {
      car_status: CarStatus
      expense_category: ExpenseCategory
      currency_type: CurrencyType
    }
  }
}
