import React from 'react'
import { Filter, X } from 'lucide-react'

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
  className = ''
}: FilterSelectProps) {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all duration-200"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface FilterRangeProps {
  label: string
  minValue: string
  maxValue: string
  onMinChange: (value: string) => void
  onMaxChange: (value: string) => void
  placeholder?: { min: string; max: string }
  type?: 'text' | 'number'
  className?: string
}

export function FilterRange({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder = { min: 'Min', max: 'Max' },
  type = 'number',
  className = ''
}: FilterRangeProps) {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</label>
      <div className="flex space-x-3">
        <input
          type={type}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
          placeholder={placeholder.min}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
        />
        <span className="flex items-center text-gray-400 font-medium">—</span>
        <input
          type={type}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder={placeholder.max}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
        />
      </div>
    </div>
  )
}

interface FilterContainerProps {
  children: React.ReactNode
  isOpen: boolean
  onToggle: () => void
  onClear: () => void
  activeFiltersCount: number
  className?: string
}

export function FilterContainer({
  children,
  isOpen,
  onToggle,
  onClear,
  activeFiltersCount,
  className = ''
}: FilterContainerProps) {
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={onToggle}
        className="flex items-center space-x-3 px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all duration-200"
      >
        <Filter className="h-5 w-5" />
        <span>Filters</span>
        {activeFiltersCount > 0 && (
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs rounded-full px-2.5 py-1 min-w-[1.5rem] text-center font-semibold">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-96 modern-card z-10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Filter Options</h3>
            <div className="flex items-center space-x-3">
              {activeFiltersCount > 0 && (
                <button
                  onClick={onClear}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>Clear all</span>
                </button>
              )}
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm transition-all duration-200"
      />
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>
  )
}
