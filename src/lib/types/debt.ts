import { CurrencyType } from './database'

export interface Debt {
  id: string
  user_id: string
  car_id: string | null
  creditor_name: string
  description: string
  amount: number
  currency: CurrencyType
  debt_date: string
  due_date: string | null
  status: 'pending' | 'paid' | 'overdue'
  payment_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DebtPayment {
  id: string
  debt_id: string
  amount: number
  currency: CurrencyType
  payment_date: string
  notes: string | null
  created_at: string
}

export interface DebtSummary {
  totalDebt: number
  paidDebt: number
  pendingDebt: number
  overdueDebt: number
  totalDebts: number
}
