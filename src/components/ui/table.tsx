import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface TableProps {
  children: React.ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full">
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: React.ReactNode
  className?: string
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <thead className={`bg-gradient-to-r from-indigo-50 to-purple-50 ${className}`}>
      {children}
    </thead>
  )
}

interface TableBodyProps {
  children: React.ReactNode
  className?: string
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return (
    <tbody className={`bg-white divide-y divide-gray-100 ${className}`}>
      {children}
    </tbody>
  )
}

interface TableRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function TableRow({ children, className = '', onClick }: TableRowProps) {
  return (
    <tr
      className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function TableCell({ children, className = '', align = 'left' }: TableCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align]

  return (
    <td className={`px-6 py-5 whitespace-nowrap text-sm ${alignClass} ${className}`}>
      {children}
    </td>
  )
}

interface SortableHeaderProps {
  children: React.ReactNode
  sortKey: string
  currentSort: { key: string; direction: 'asc' | 'desc' } | null
  onSort: (key: string) => void
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function SortableHeader({ 
  children, 
  sortKey, 
  currentSort, 
  onSort, 
  className = '',
  align = 'left'
}: SortableHeaderProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align]

  const isActive = currentSort?.key === sortKey
  const direction = isActive ? currentSort.direction : null

  return (
    <th
      className={`px-6 py-4 ${alignClass} text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gradient-to-r hover:from-indigo-100 hover:to-purple-100 transition-all duration-200 select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`h-3 w-3 ${isActive && direction === 'asc' ? 'text-indigo-600' : 'text-gray-400'}`}
          />
          <ChevronDown
            className={`h-3 w-3 -mt-1 ${isActive && direction === 'desc' ? 'text-indigo-600' : 'text-gray-400'}`}
          />
        </div>
      </div>
    </th>
  )
}

interface TableHeaderCellProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function TableHeaderCell({ children, className = '', align = 'left' }: TableHeaderCellProps) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }[align]

  return (
    <th className={`px-6 py-4 ${alignClass} text-xs font-semibold text-gray-700 uppercase tracking-wider ${className}`}>
      {children}
    </th>
  )
}
