export type CarStatus = 'in_transit' | 'for_sale' | 'sold' | 'reserved'
export type ExpenseCategory = 'purchase' | 'transport' | 'customs' | 'repair' | 'maintenance' | 'marketing' | 'office' | 'other'
export type CurrencyType = 'AED' | 'USD' | 'EUR' | 'GBP'
export type UserRole = 'importer' | 'exporter' | 'admin'
export type PaymentMethod = 'cash' | 'bank_card'

// Market Prices Types
export type VehicleCondition = 'excellent' | 'good' | 'fair' | 'poor'

// Cash Management Types
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'car_sale_payment' | 'car_purchase_payment' | 'expense_payment' | 'debt_payment' | 'other'
export type AccountType = 'cash' | 'bank_checking' | 'bank_savings' | 'credit_card' | 'other'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'failed'

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

  // Status and tracking
  status: CarStatus
  location?: string
  notes?: string

  // Photo
  photo_url?: string

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

export interface FinancialAccount {
  id: string
  user_id: string
  name: string
  account_type: AccountType
  currency: CurrencyType
  initial_balance: number
  current_balance: number
  account_number?: string
  bank_name?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CashTransaction {
  id: string
  user_id: string
  account_id: string
  transaction_type: TransactionType
  amount: number
  currency: CurrencyType
  description: string
  reference_number?: string
  car_id?: string
  client_id?: string
  expense_id?: string
  to_account_id?: string
  transaction_date: string
  status: TransactionStatus
  notes?: string
  receipt_url?: string
  created_at: string
  updated_at: string

  // Relations
  account?: FinancialAccount
  to_account?: FinancialAccount
  car?: Car
  client?: Client
  expense?: Expense
}

export interface AccountBalanceHistory {
  id: string
  account_id: string
  transaction_id?: string
  previous_balance: number
  new_balance: number
  balance_change: number
  change_reason: string
  created_at: string

  // Relations
  account?: FinancialAccount
  transaction?: CashTransaction
}

export interface CarProfitAnalysis {
  id: string
  user_id: string
  vin: string
  make: string
  model: string
  year: number
  status: CarStatus
  photo_url?: string
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

export interface MarketPrice {
  id: string
  user_id: string
  make: string
  model: string
  year: number
  mileage?: number
  condition: VehicleCondition
  market_price: number
  currency: CurrencyType
  source?: string
  notes?: string
  date_updated: string
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
      financial_accounts: {
        Row: FinancialAccount
        Insert: Omit<FinancialAccount, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<FinancialAccount, 'id' | 'created_at' | 'updated_at'>>
      }
      cash_transactions: {
        Row: CashTransaction
        Insert: Omit<CashTransaction, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CashTransaction, 'id' | 'created_at' | 'updated_at'>>
      }
      account_balance_history: {
        Row: AccountBalanceHistory
        Insert: Omit<AccountBalanceHistory, 'id' | 'created_at'>
        Update: Partial<Omit<AccountBalanceHistory, 'id' | 'created_at'>>
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
      market_prices: {
        Row: MarketPrice
        Insert: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>>
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
      vehicle_condition: VehicleCondition
    }
  }
}
