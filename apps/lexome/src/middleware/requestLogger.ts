/**
 * Enhanced Request Logging Middleware
 * Provides detailed logging for all API requests including timing, status, and errors
 */
import type { Request, Response, NextFunction } from 'express'

interface LogEntry {
  timestamp: string
  method: string
  url: string
  userId?: string
  statusCode?: number
  duration?: number
  error?: string
  ip: string
  userAgent?: string
}

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'authorization',
  ]

  const sanitized = { ...body }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    entry.method,
    entry.url,
    entry.statusCode ? `- ${entry.statusCode}` : '',
    entry.duration ? `(${entry.duration}ms)` : '',
    entry.userId ? `[User: ${entry.userId}]` : '',
    entry.error ? `ERROR: ${entry.error}` : '',
  ]

  return parts.filter(Boolean).join(' ')
}

/**
 * Get color for status code
 */
function getStatusColor(statusCode: number): string {
  if (statusCode >= 500) return '\x1b[31m' // Red
  if (statusCode >= 400) return '\x1b[33m' // Yellow
  if (statusCode >= 300) return '\x1b[36m' // Cyan
  if (statusCode >= 200) return '\x1b[32m' // Green
  return '\x1b[0m' // Reset
}

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  // Create base log entry
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
  }

  // Try to extract user ID from request (if auth middleware ran first)
  if (req.user && typeof req.user === 'object' && 'id' in req.user) {
    logEntry.userId = (req.user as any).id
  }

  // Log request start (only in development for verbosity)
  if (process.env.NODE_ENV === 'development') {
    const sanitizedBody = req.body ? sanitizeBody(req.body) : undefined
    console.log(
      `\x1b[34m→ ${req.method} ${req.originalUrl}\x1b[0m`,
      sanitizedBody ? JSON.stringify(sanitizedBody) : ''
    )
  }

  // Override res.json to capture response
  const originalJson = res.json.bind(res)
  res.json = function (body: any) {
    logEntry.statusCode = res.statusCode
    logEntry.duration = Date.now() - startTime

    // Log response
    const color = getStatusColor(res.statusCode)
    const resetColor = '\x1b[0m'
    console.log(`${color}${formatLogEntry(logEntry)}${resetColor}`)

    // Log error responses with more detail
    if (res.statusCode >= 400 && body?.error) {
      console.error(`  Error: ${body.error}`)
      if (body.details) {
        console.error(`  Details: ${JSON.stringify(body.details)}`)
      }
    }

    return originalJson(body)
  }

  // Capture errors
  const originalSend = res.send.bind(res)
  res.send = function (body: any) {
    if (!logEntry.statusCode) {
      logEntry.statusCode = res.statusCode
      logEntry.duration = Date.now() - startTime

      const color = getStatusColor(res.statusCode)
      const resetColor = '\x1b[0m'
      console.log(`${color}${formatLogEntry(logEntry)}${resetColor}`)
    }

    return originalSend(body)
  }

  // Handle response finish (fallback)
  res.on('finish', () => {
    if (!logEntry.statusCode) {
      logEntry.statusCode = res.statusCode
      logEntry.duration = Date.now() - startTime

      const color = getStatusColor(res.statusCode)
      const resetColor = '\x1b[0m'
      console.log(`${color}${formatLogEntry(logEntry)}${resetColor}`)
    }
  })

  next()
}

/**
 * Error logging middleware (should be added after routes)
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode || 500,
    error: err.message,
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.get('user-agent'),
  }

  if (req.user && typeof req.user === 'object' && 'id' in req.user) {
    logEntry.userId = (req.user as any).id
  }

  // Log error with stack trace
  console.error('\x1b[31m' + formatLogEntry(logEntry) + '\x1b[0m')
  console.error('Stack trace:', err.stack)

  next(err)
}

/**
 * Structured log for production use
 * Returns a JSON-formatted log that can be ingested by log aggregators
 */
export function structuredLogger(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()

  const originalJson = res.json.bind(res)
  res.json = function (body: any) {
    const logData = {
      '@timestamp': new Date().toISOString(),
      level: res.statusCode >= 400 ? 'error' : 'info',
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: Date.now() - startTime,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user && typeof req.user === 'object' && 'id' in req.user ? (req.user as any).id : undefined,
      error: res.statusCode >= 400 && body?.error ? body.error : undefined,
    }

    // Use console.log for structured JSON (can be parsed by log collectors)
    console.log(JSON.stringify(logData))

    return originalJson(body)
  }

  next()
}
