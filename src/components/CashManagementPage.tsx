'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FinancialAccount, CashTransaction, AccountType, TransactionType } from '@/lib/types/database'
import { formatCurrency, convertCurrency } from '@/lib/utils/currency'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import {
  Plus,
  Wallet,
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  DollarSign,
  Banknote
} from 'lucide-react'
import AddAccountModal from './AddAccountModal'
import AddTransactionModal from './AddTransactionModal'
import TransactionDetailModal from './TransactionDetailModal'

interface CashManagementPageProps {
  onDataUpdate?: () => void
}

export default function CashManagementPage({ onDataUpdate }: CashManagementPageProps) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showAddAccountModal, setShowAddAccountModal] = useState(false)
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('No authenticated user')
        setAccounts([])
        setTransactions([])
        return
      }

      // Fetch accounts (only for current user)
      const { data: accountsData, error: accountsError } = await supabase
        .from('financial_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (accountsError) throw accountsError
      setAccounts(accountsData || [])

      // Fetch transactions (only for current user)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('cash_transactions')
        .select(`
          *,
          financial_accounts!cash_transactions_account_id_fkey (
            id,
            name,
            account_type
          ),
          financial_accounts!cash_transactions_to_account_id_fkey (
            id,
            name,
            account_type
          ),
          cars (
            id,
            vin,
            make,
            model,
            year
          ),
          clients (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      if (transactionsError) throw transactionsError
      setTransactions(transactionsData || [])
    } catch (error) {
      console.error('Error fetching cash management data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTransactionClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId)
    setShowDetailModal(true)
  }

  const getAccountIcon = (accountType: AccountType) => {
    switch (accountType) {
      case 'cash':
        return <Wallet className="h-5 w-5" />
      case 'bank_checking':
      case 'bank_savings':
        return <Building2 className="h-5 w-5" />
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />
      default:
        return <DollarSign className="h-5 w-5" />
    }
  }

  const getTransactionIcon = (transactionType: TransactionType) => {
    switch (transactionType) {
      case 'deposit':
      case 'car_sale_payment':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />
      case 'withdrawal':
      case 'car_purchase_payment':
      case 'expense_payment':
      case 'debt_payment':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />
      case 'transfer':
        return <ArrowUpRight className="h-4 w-4 text-blue-600" />
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionTypeLabel = (type: TransactionType) => {
    const labels: Record<TransactionType, string> = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      transfer: 'Transfer',
      car_sale_payment: 'Car Sale Payment',
      car_purchase_payment: 'Car Purchase Payment',
      expense_payment: 'Expense Payment',
      debt_payment: 'Debt Payment',
      other: 'Other'
    }
    return labels[type] || type
  }

  const getAccountTypeLabel = (type: AccountType) => {
    const labels: Record<AccountType, string> = {
      cash: 'Cash',
      bank_checking: 'Bank Checking',
      bank_savings: 'Bank Savings',
      credit_card: 'Credit Card',
      other: 'Other'
    }
    return labels[type] || type
  }

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAccount = accountFilter === 'all' || transaction.account_id === accountFilter
    const matchesType = typeFilter === 'all' || transaction.transaction_type === typeFilter
    
    return matchesSearch && matchesAccount && matchesType
  })

  // Calculate summary statistics
  const totalBalance = accounts.reduce((sum, account) => 
    sum + convertCurrency(account.current_balance, account.currency, 'AED'), 0)
  
  const totalIncome = transactions
    .filter(t => ['deposit', 'car_sale_payment'].includes(t.transaction_type))
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, 'AED'), 0)
  
  const totalExpenses = transactions
    .filter(t => ['withdrawal', 'car_purchase_payment', 'expense_payment', 'debt_payment'].includes(t.transaction_type))
    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, 'AED'), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading cash management...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cash & Bank Management</h1>
        <p className="text-gray-600">Manage your cash flow, bank accounts, and financial transactions</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Banknote className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Balance</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalBalance, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Income</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalIncome, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(totalExpenses, 'AED')}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wallet className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Accounts</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {accounts.filter(a => a.is_active).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddAccountModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </button>
        <button
          onClick={() => setShowAddTransactionModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </button>
      </div>

      {/* Accounts Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.filter(account => account.is_active).map((account) => (
            <div key={account.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {getAccountIcon(account.account_type)}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {account.name}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(account.current_balance, account.currency)}
                      </dd>
                      <dd className="text-xs text-gray-500">
                        {getAccountTypeLabel(account.account_type)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
          
          {/* Search and Filters */}
          <div className="flex space-x-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="transfer">Transfers</option>
              <option value="car_sale_payment">Car Sale Payments</option>
              <option value="car_purchase_payment">Car Purchase Payments</option>
              <option value="expense_payment">Expense Payments</option>
              <option value="debt_payment">Debt Payments</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredTransactions.map((transaction) => (
              <li key={transaction.id}>
                <button
                  onClick={() => handleTransactionClick(transaction.id)}
                  className="w-full px-4 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getTransactionIcon(transaction.transaction_type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {transaction.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getTransactionTypeLabel(transaction.transaction_type)} • {formatDate(transaction.transaction_date)}
                        </div>
                        {transaction.reference_number && (
                          <div className="text-xs text-gray-400">
                            Ref: {transaction.reference_number}
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Added {formatRelativeTime(transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        ['deposit', 'car_sale_payment'].includes(transaction.transaction_type)
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {['deposit', 'car_sale_payment'].includes(transaction.transaction_type) ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {accounts.find(a => a.id === transaction.account_id)?.name}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || accountFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first transaction.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAccountAdded={fetchData}
      />

      <AddTransactionModal
        isOpen={showAddTransactionModal}
        onClose={() => setShowAddTransactionModal(false)}
        onTransactionAdded={fetchData}
        accounts={accounts}
      />

      <TransactionDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        transactionId={selectedTransactionId}
        onTransactionUpdated={fetchData}
      />
    </div>
  )
}
