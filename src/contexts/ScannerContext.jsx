import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useStaffing } from './StaffingContext'
import { db, isFirebaseConfigured, saveData, DB_PATHS } from '../config/firebase'
import { useAudioFeedback } from '../hooks/useAudioFeedback'

const ScannerContext = createContext(null)

// Badge format: PLX-12345678-ABC
// We extract just the employee number (12345678)
const extractEmployeeNumber = (badgeData) => {
  // Try to extract from PLX-XXXXXXXX-XXX format
  const plxMatch = badgeData.match(/PLX-(\d+)-[A-Z]{3}/i)
  if (plxMatch) {
    return plxMatch[1]
  }

  // If just numbers, assume it's the employee number
  const numbersOnly = badgeData.replace(/\D/g, '')
  if (numbersOnly.length >= 6) {
    return numbersOnly
  }

  return null
}

export function ScannerProvider({ children }) {
  const {
    activeAssociates,
    dailyAssignments,
    addToWaitlist,
    isEmployeeAlreadyPresent,
    currentDate,
    currentShift,
    lines
  } = useStaffing()

  const { playSuccess, playError, playWarning, playDuplicate } = useAudioFeedback()

  const [isScanModeActive, setIsScanModeActive] = useState(false)
  const [isKioskMode, setIsKioskMode] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [scanBuffer, setScanBuffer] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(true)

  const scanTimeoutRef = useRef(null)
  const inputBufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)

  // Keyboard-wedge scanner handler
  // Barcode scanners typically type characters rapidly and end with Enter
  useEffect(() => {
    if (!isScanModeActive && !isKioskMode) return

    const handleKeyDown = (e) => {
      const now = Date.now()

      // If more than 100ms since last keypress, reset buffer
      // Barcode scanners type much faster than humans
      if (now - lastKeyTimeRef.current > 100) {
        inputBufferRef.current = ''
      }
      lastKeyTimeRef.current = now

      // Handle Enter key - process the scan
      if (e.key === 'Enter') {
        e.preventDefault()
        const scannedData = inputBufferRef.current.trim()
        if (scannedData.length >= 6) {
          processScan(scannedData)
        }
        inputBufferRef.current = ''
        return
      }

      // Ignore non-printable keys
      if (e.key.length > 1) return

      // Add character to buffer
      inputBufferRef.current += e.key
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isScanModeActive, isKioskMode])

  // Process a scanned badge
  const processScan = useCallback(async (badgeData) => {
    if (isProcessing) return

    // Clear any previous scan result immediately
    setScanResult(null)
    setIsProcessing(true)

    const employeeNumber = extractEmployeeNumber(badgeData)

    if (!employeeNumber) {
      const result = {
        success: false,
        status: 'invalid',
        message: 'Invalid badge format',
        rawData: badgeData,
        timestamp: new Date().toISOString()
      }
      setScanResult(result)
      setLastScan(result)
      setScanHistory(prev => [result, ...prev.slice(0, 49)])
      if (audioEnabled) playError()
      setIsProcessing(false)
      return result
    }

    // Check if associate is in the active associates database
    const associate = activeAssociates[employeeNumber]

    if (!associate) {
      // Unknown associate
      const result = {
        success: false,
        status: 'unknown',
        employeeNumber,
        message: 'Welcome to Crescent! Please see the SPM for assistance.',
        rawData: badgeData,
        timestamp: new Date().toISOString()
      }
      setScanResult(result)
      setLastScan(result)
      setScanHistory(prev => [result, ...prev.slice(0, 49)])
      await logScan(result)
      if (audioEnabled) playWarning()
      setIsProcessing(false)
      return result
    }

    // Check for duplicates
    const presenceCheck = isEmployeeAlreadyPresent(employeeNumber)

    if (presenceCheck.present) {
      // Already scanned in
      let message = `${associate.firstName} ${associate.lastName} (${employeeNumber}) - Welcome back!`

      if (presenceCheck.location === 'waitlist') {
        message += '\n\nYou are on the waitlist. Please wait for assignment.'
      } else {
        message += `\n\nYou are assigned to ${presenceCheck.location}.`
      }

      // In kiosk mode, also show their current line assignment if they have one
      if (isKioskMode) {
        const lineAssignment = findLineAssignment(employeeNumber)
        if (lineAssignment) {
          message = `${associate.firstName} ${associate.lastName} (${employeeNumber}) - Welcome back!\n\n`
          message += `Assigned to: Line ${lineAssignment.line}\n`
          message += `Lead(s): ${lineAssignment.leads.join(', ')}`
        }
      }

      const result = {
        success: true,
        status: 'duplicate',
        employeeNumber,
        associate,
        message,
        location: presenceCheck.location,
        rawData: badgeData,
        timestamp: new Date().toISOString()
      }
      setScanResult(result)
      setLastScan(result)
      setScanHistory(prev => [result, ...prev.slice(0, 49)])
      if (audioEnabled) playDuplicate()
      setIsProcessing(false)
      return result
    }

    // Add to waitlist
    const fullName = `${associate.firstName} ${associate.lastName}`
    addToWaitlist(fullName, false, employeeNumber)

    // Check daily assignment first, then fallback to line assignment
    const dailyAssignment = dailyAssignments[employeeNumber]
    const lineAssignment = findLineAssignment(employeeNumber)
    const assignment = dailyAssignment || lineAssignment

    let message = `${fullName} (${employeeNumber}) - Welcome back!`
    if (assignment) {
      message += `\n\nAssigned to: Line ${assignment.line}`
      if (assignment.leads && assignment.leads.length > 0) {
        message += `\nLead(s): ${assignment.leads.join(', ')}`
      }
      if (dailyAssignment) {
        message += '\n\n[Pre-assigned for today\'s shift]'
      }
    } else {
      message += '\n\nAdded to waitlist. Please wait for assignment.'
    }

    const result = {
      success: true,
      status: 'added',
      employeeNumber,
      associate,
      message,
      addedToWaitlist: true,
      lineAssignment,
      dailyAssignment,
      rawData: badgeData,
      timestamp: new Date().toISOString()
    }

    setScanResult(result)
    setLastScan(result)
    setScanHistory(prev => [result, ...prev.slice(0, 49)])
    await logScan(result)

    // Play success audio
    if (audioEnabled) playSuccess()

    // Trigger door unlock signal if assigned (for future hardware integration)
    if (assignment) {
      triggerDoorUnlock()
    }

    setIsProcessing(false)
    return result
  }, [activeAssociates, dailyAssignments, addToWaitlist, isEmployeeAlreadyPresent, isKioskMode, currentDate, currentShift, lines, audioEnabled, playSuccess, playError, playWarning, playDuplicate])

  // Find if an employee has a line assignment
  const findLineAssignment = useCallback((employeeNumber) => {
    for (const line of lines) {
      for (const position of line.positions) {
        if (position.employeeNumber === employeeNumber) {
          return {
            line: line.letter,
            leads: line.leads || [],
            position: position
          }
        }
      }
    }
    return null
  }, [lines])

  // Log scan to Firebase for security/auditing
  const logScan = async (scanResult) => {
    if (!isFirebaseConfigured || !db) return

    try {
      const logPath = `${DB_PATHS.SCAN_LOG}/${currentDate}_${currentShift}`
      const logEntry = {
        ...scanResult,
        associate: scanResult.associate ? {
          firstName: scanResult.associate.firstName,
          lastName: scanResult.associate.lastName
        } : null
      }

      // Use timestamp as key
      await saveData(`${logPath}/${Date.now()}`, logEntry)
    } catch (error) {
      console.error('Error logging scan:', error)
    }
  }

  // Door unlock signal (placeholder for hardware integration)
  const triggerDoorUnlock = useCallback(() => {
    console.log('DOOR_UNLOCK_SIGNAL: Triggering door unlock')

    // This is where hardware integration would go
    // Options include:
    // 1. WebSerial API to communicate with Arduino
    // 2. WebUSB for direct USB device communication
    // 3. HTTP request to a local server controlling the lock
    // 4. WebSocket to a Raspberry Pi

    // Emit a custom event that external hardware integrations can listen for
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crescentDoorUnlock', {
        detail: {
          timestamp: new Date().toISOString(),
          duration: 5000 // Unlock for 5 seconds
        }
      }))
    }
  }, [])

  // Clear scan result after a timeout
  useEffect(() => {
    if (scanResult) {
      const timeout = setTimeout(() => {
        setScanResult(null)
      }, 2000) // Clear after 2 seconds (faster for kiosk mode)

      return () => clearTimeout(timeout)
    }
  }, [scanResult])

  // Manual scan entry (for testing or manual input)
  const manualScan = useCallback((badgeData) => {
    return processScan(badgeData)
  }, [processScan])

  // Toggle scan mode
  const toggleScanMode = useCallback(() => {
    setIsScanModeActive(prev => !prev)
    if (!isScanModeActive) {
      setScanResult(null)
      inputBufferRef.current = ''
    }
  }, [isScanModeActive])

  // Toggle kiosk mode
  const toggleKioskMode = useCallback(() => {
    setIsKioskMode(prev => !prev)
    if (!isKioskMode) {
      setScanResult(null)
      inputBufferRef.current = ''
    }
  }, [isKioskMode])

  const value = {
    // State
    isScanModeActive,
    isKioskMode,
    lastScan,
    scanResult,
    scanHistory,
    isProcessing,
    audioEnabled,

    // Methods
    toggleScanMode,
    toggleKioskMode,
    setIsScanModeActive,
    setIsKioskMode,
    setAudioEnabled,
    manualScan,
    processScan,
    triggerDoorUnlock,
    clearScanResult: () => setScanResult(null)
  }

  return (
    <ScannerContext.Provider value={value}>
      {children}
    </ScannerContext.Provider>
  )
}

export function useScanner() {
  const context = useContext(ScannerContext)
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider')
  }
  return context
}

export default ScannerContext
