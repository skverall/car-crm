'use client'

import { Search, X } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

interface FilterOption {
  value: string
  label: string
}

interface TableFiltersProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: {
    key: string
    label: string
    value: string
    options: FilterOption[]
    onChange: (value: string) => void
  }[]
  onClearFilters?: () => void
  className?: string
}

export function TableFilters({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  onClearFilters,
  className = ""
}: TableFiltersProps) {
  const hasActiveFilters = searchValue || filters.some(filter => filter.value !== 'all')

  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {searchValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filter Selects */}
      {filters.map((filter) => (
        <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {/* Clear Filters Button */}
      {hasActiveFilters && onClearFilters && (
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="whitespace-nowrap"
        >
          Clear Filters
        </Button>
      )}
    </div>
  )
}
