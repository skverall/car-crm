import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function calculateDaysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function validateVIN(vin: string): boolean {
  // More flexible VIN validation - allows any length but checks format
  if (vin.length === 0) {
    return false
  }

  // Check if VIN contains only valid characters (alphanumeric except I, O, Q)
  // This is more flexible and doesn't enforce 17 character length
  const vinRegex = /^[A-HJ-NPR-Z0-9]+$/
  return vinRegex.test(vin.toUpperCase())
}

export function formatVIN(vin: string): string {
  // Only convert to uppercase, don't remove characters
  return vin.toUpperCase().trim()
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    in_transit: 'bg-blue-100 text-blue-800',
    for_sale: 'bg-green-100 text-green-800',
    sold: 'bg-gray-100 text-gray-800',
    reserved: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_transit: 'In Transit',
    for_sale: 'For Sale',
    sold: 'Sold',
    reserved: 'Reserved',
  }
  return labels[status] || status
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    purchase: 'Purchase',
    transport: 'Transport',
    customs: 'Customs',
    repair: 'Repair',
    maintenance: 'Maintenance',
    marketing: 'Marketing',
    office: 'Office',
    other: 'Other',
  }
  return labels[category] || category
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
