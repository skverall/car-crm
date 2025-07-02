/**
 * Security utilities for the CRM application
 */

/**
 * Content Security Policy helpers
 */
export const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  imgSrc: ["'self'", "data:", "https:", "blob:"],
  connectSrc: ["'self'", "https://api.exchangerate-api.com", "wss://"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: []
}

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const kebabCase = directive.replace(/([A-Z])/g, '-$1').toLowerCase()
      return `${kebabCase} ${sources.join(' ')}`
    })
    .join('; ')
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '')
}

/**
 * Validate file upload security
 */
export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedName?: string
}

export function validateFileUpload(file: File, options: {
  maxSize?: number // in bytes
  allowedTypes?: string[]
  allowedExtensions?: string[]
} = {}): FileValidationResult {
  const errors: string[] = []
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`)
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`)
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`)
  }

  // Sanitize filename
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .substring(0, 100) // Limit length

  // Check for suspicious patterns
  if (file.name.includes('..')) {
    errors.push('Filename contains suspicious patterns')
  }

  if (file.name.startsWith('.')) {
    errors.push('Hidden files are not allowed')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedName
  }
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  // Use crypto.getRandomValues if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
  } else {
    // Fallback to Math.random (less secure)
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)]
    }
  }
  
  return result
}

/**
 * Hash sensitive data (client-side hashing for additional security)
 */
export async function hashData(data: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback for environments without crypto.subtle
  return btoa(data).replace(/[^a-zA-Z0-9]/g, '')
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function validateURL(url: string): { isValid: boolean; error?: string } {
  try {
    const parsedURL = new URL(url)
    
    // Only allow HTTPS
    if (parsedURL.protocol !== 'https:') {
      return { isValid: false, error: 'Only HTTPS URLs are allowed' }
    }
    
    // Block private IP ranges
    const hostname = parsedURL.hostname
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ]
    
    if (privateIPPatterns.some(pattern => pattern.test(hostname))) {
      return { isValid: false, error: 'Private IP addresses are not allowed' }
    }
    
    // Block localhost
    if (hostname === 'localhost' || hostname === '0.0.0.0') {
      return { isValid: false, error: 'Localhost is not allowed' }
    }
    
    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' }
  }
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  userId?: string
  action: string
  resource: string
  resourceId?: string
  details?: Record<string, any>
  timestamp: Date
  ipAddress?: string
  userAgent?: string
}

/**
 * Security audit logger
 */
export class SecurityAuditLogger {
  private static logs: AuditLogEntry[] = []
  
  static log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date()
    }
    
    this.logs.push(auditEntry)
    
    // Keep only last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000)
    }
    
    // In production, send to external logging service
    console.log('Security Audit:', auditEntry)
  }
  
  static getLogs(filter?: Partial<AuditLogEntry>): AuditLogEntry[] {
    if (!filter) return [...this.logs]
    
    return this.logs.filter(log => {
      return Object.entries(filter).every(([key, value]) => {
        return log[key as keyof AuditLogEntry] === value
      })
    })
  }
  
  static clearLogs(): void {
    this.logs = []
  }
}

/**
 * Input sanitization for different contexts
 */
export const sanitizers = {
  /**
   * Sanitize for SQL-like contexts (though we use Supabase, extra safety)
   */
  sql: (input: string): string => {
    return input
      .replace(/['";\\]/g, '') // Remove SQL injection chars
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments
      .replace(/\*\//g, '')
      .trim()
  },

  /**
   * Sanitize for filename usage
   */
  filename: (input: string): string => {
    return input
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename chars
      .replace(/\.\./g, '_') // Remove directory traversal
      .replace(/^\./, '_') // Remove leading dot
      .substring(0, 255) // Limit length
      .trim()
  },

  /**
   * Sanitize for display (basic HTML escaping)
   */
  display: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  },

  /**
   * Sanitize for URL usage
   */
  url: (input: string): string => {
    return encodeURIComponent(input)
  }
}

/**
 * Check for suspicious patterns in user input
 */
export function detectSuspiciousPatterns(input: string): string[] {
  const suspiciousPatterns = [
    { pattern: /<script/i, description: 'Script tag detected' },
    { pattern: /javascript:/i, description: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/i, description: 'Event handler detected' },
    { pattern: /\.\.\//g, description: 'Directory traversal detected' },
    { pattern: /union\s+select/i, description: 'SQL injection pattern detected' },
    { pattern: /drop\s+table/i, description: 'SQL drop statement detected' },
    { pattern: /exec\s*\(/i, description: 'Code execution pattern detected' },
    { pattern: /eval\s*\(/i, description: 'Eval function detected' },
    { pattern: /document\.cookie/i, description: 'Cookie access detected' },
    { pattern: /window\.location/i, description: 'Location manipulation detected' }
  ]

  const detectedPatterns: string[] = []

  suspiciousPatterns.forEach(({ pattern, description }) => {
    if (pattern.test(input)) {
      detectedPatterns.push(description)
    }
  })

  return detectedPatterns
}

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(headers: Headers): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value)
  })
}
