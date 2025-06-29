'use client'

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from './button'
import { TableHead } from './table'

export type SortDirection = 'asc' | 'desc' | null

interface SortableTableHeaderProps {
  children: React.ReactNode
  sortKey: string
  currentSort: { key: string; direction: SortDirection }
  onSort: (key: string) => void
  className?: string
}

export function SortableTableHeader({
  children,
  sortKey,
  currentSort,
  onSort,
  className
}: SortableTableHeaderProps) {
  const isActive = currentSort.key === sortKey
  const direction = isActive ? currentSort.direction : null

  const getSortIcon = () => {
    if (!isActive || direction === null) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (direction === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        onClick={() => onSort(sortKey)}
        className="h-auto p-0 font-medium hover:bg-transparent"
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  )
}
