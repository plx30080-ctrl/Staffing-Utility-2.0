import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for handling keyboard-wedge barcode scanners
 *
 * Keyboard-wedge scanners act like keyboards, typing characters rapidly
 * and typically ending with an Enter key press.
 *
 * @param {Object} options Configuration options
 * @param {boolean} options.enabled Whether scanning is enabled
 * @param {Function} options.onScan Callback when a scan is detected
 * @param {number} options.minLength Minimum barcode length (default: 6)
 * @param {number} options.maxGap Maximum time between keystrokes in ms (default: 100)
 * @param {string} options.terminator Key that terminates scan (default: 'Enter')
 */
export function useBarcodeScanner({
  enabled = false,
  onScan,
  minLength = 6,
  maxGap = 100,
  terminator = 'Enter'
} = {}) {
  const [buffer, setBuffer] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [lastScanTime, setLastScanTime] = useState(null)

  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef(null)

  // Reset buffer after timeout
  const resetBuffer = useCallback(() => {
    bufferRef.current = ''
    setBuffer('')
    setIsScanning(false)
  }, [])

  // Process the scanned barcode
  const processBarcode = useCallback((barcode) => {
    if (barcode.length >= minLength) {
      setLastScanTime(Date.now())
      if (onScan) {
        onScan(barcode)
      }
    }
    resetBuffer()
  }, [minLength, onScan, resetBuffer])

  // Handle keydown events
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e) => {
      const now = Date.now()

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // If more than maxGap since last keypress, reset buffer
      // This indicates human typing rather than scanner
      if (now - lastKeyTimeRef.current > maxGap) {
        bufferRef.current = ''
      }
      lastKeyTimeRef.current = now

      // Handle terminator key (usually Enter)
      if (e.key === terminator) {
        const scannedData = bufferRef.current.trim()

        // Only process if buffer has content and meets minimum length
        // This prevents Enter key alone from triggering
        if (scannedData.length >= minLength) {
          e.preventDefault()
          e.stopPropagation()
          processBarcode(scannedData)
        }

        bufferRef.current = ''
        setBuffer('')
        setIsScanning(false)
        return
      }

      // Ignore non-printable keys
      if (e.key.length > 1) return

      // Prevent default if we're in scanning mode (buffer has content)
      if (bufferRef.current.length > 0) {
        e.preventDefault()
      }

      // Add character to buffer
      bufferRef.current += e.key
      setBuffer(bufferRef.current)
      setIsScanning(true)

      // Set timeout to reset buffer if no more input
      timeoutRef.current = setTimeout(() => {
        resetBuffer()
      }, maxGap * 2)
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, maxGap, minLength, terminator, processBarcode, resetBuffer])

  // Manual scan function (for testing or manual input)
  const manualScan = useCallback((barcode) => {
    processBarcode(barcode)
  }, [processBarcode])

  // Clear buffer manually
  const clearBuffer = useCallback(() => {
    resetBuffer()
  }, [resetBuffer])

  return {
    buffer,
    isScanning,
    lastScanTime,
    manualScan,
    clearBuffer
  }
}

/**
 * Extract employee number from various badge formats
 *
 * Supported formats:
 * - PLX-12345678-ABC (Crescent format)
 * - Plain numbers (e.g., 12345678)
 * - Other formats with embedded numbers
 *
 * @param {string} badgeData Raw barcode data
 * @returns {string|null} Employee number or null if invalid
 */
export function extractEmployeeNumber(badgeData) {
  if (!badgeData || typeof badgeData !== 'string') {
    return null
  }

  // Clean the input
  const cleaned = badgeData.trim()

  // Try PLX-XXXXXXXX-XXX format first
  const plxMatch = cleaned.match(/PLX-(\d+)-[A-Z]{3}/i)
  if (plxMatch) {
    return plxMatch[1]
  }

  // Try to extract any sequence of 6+ digits
  const numbersOnly = cleaned.replace(/\D/g, '')
  if (numbersOnly.length >= 6) {
    return numbersOnly
  }

  return null
}

/**
 * Validate badge format
 *
 * @param {string} badgeData Raw barcode data
 * @returns {Object} Validation result with isValid, format, and employeeNumber
 */
export function validateBadge(badgeData) {
  if (!badgeData || typeof badgeData !== 'string') {
    return { isValid: false, error: 'Empty or invalid input' }
  }

  const cleaned = badgeData.trim()

  // Check for PLX format
  const plxMatch = cleaned.match(/PLX-(\d+)-([A-Z]{3})/i)
  if (plxMatch) {
    return {
      isValid: true,
      format: 'PLX',
      employeeNumber: plxMatch[1],
      suffix: plxMatch[2],
      raw: cleaned
    }
  }

  // Check for numeric format
  const numbersOnly = cleaned.replace(/\D/g, '')
  if (numbersOnly.length >= 6) {
    return {
      isValid: true,
      format: 'NUMERIC',
      employeeNumber: numbersOnly,
      raw: cleaned
    }
  }

  return {
    isValid: false,
    error: 'Badge format not recognized',
    raw: cleaned
  }
}

export default useBarcodeScanner
