import { useState, useCallback } from 'react'
import * as XLSX from 'xlsx'

/**
 * Custom hook for parsing assignment Excel files
 *
 * Expected format (starting at row 5):
 * Column B: Last Name
 * Column C: First Name
 * Column D: Start Date
 * Column E: Employee Number
 * Column M: Status
 */
export function useAssignmentParser() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  // Parse Excel file
  const parseFile = useCallback(async (file) => {
    setIsProcessing(true)
    setProgress(0)
    setError(null)

    try {
      const data = await readFileAsArrayBuffer(file)
      setProgress(20)

      const workbook = XLSX.read(data, { type: 'array' })
      setProgress(40)

      // Get first sheet
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      setProgress(50)

      // Convert to array of arrays, starting from row 5 (index 4)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        range: 4 // Start from row 5 (0-indexed as 4)
      })
      setProgress(70)

      // Parse the data
      const associates = []
      const errors = []
      const skipped = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]

        // Skip empty rows
        if (!row || row.length === 0) continue

        // Column indices (0-based):
        // B=1 (Last Name), C=2 (First Name), D=3 (Start Date),
        // E=4 (Employee Number), M=12 (Status)
        const lastName = String(row[1] || '').trim()
        const firstName = String(row[2] || '').trim()
        const startDate = row[3]
        const employeeNumber = String(row[4] || '').trim()
        const status = String(row[12] || '').trim()

        // Validate required fields
        if (!lastName || !firstName || !employeeNumber) {
          if (lastName || firstName || employeeNumber) {
            // Row has some data but missing required fields
            errors.push({
              row: i + 5, // Actual row number
              data: { lastName, firstName, employeeNumber },
              reason: 'Missing required fields'
            })
          }
          continue
        }

        // Validate employee number format
        const cleanedNumber = employeeNumber.replace(/\D/g, '')
        if (cleanedNumber.length < 6) {
          errors.push({
            row: i + 5,
            data: { lastName, firstName, employeeNumber },
            reason: 'Invalid employee number'
          })
          continue
        }

        // Check status (only include active associates)
        const normalizedStatus = status.toLowerCase()
        if (normalizedStatus === 'terminated' ||
            normalizedStatus === 'inactive' ||
            normalizedStatus === 'ended') {
          skipped.push({
            row: i + 5,
            data: { lastName, firstName, employeeNumber },
            reason: `Status: ${status}`
          })
          continue
        }

        associates.push({
          lastName,
          firstName,
          employeeNumber: cleanedNumber,
          startDate: parseExcelDate(startDate),
          status: status || 'Active',
          rawRow: i + 5
        })

        setProgress(70 + Math.floor((i / jsonData.length) * 25))
      }

      setProgress(100)

      const result = {
        success: true,
        associates,
        errors,
        skipped,
        totalRows: jsonData.length,
        fileName: file.name,
        processedAt: new Date().toISOString()
      }

      setLastResult(result)
      setIsProcessing(false)
      return result

    } catch (err) {
      console.error('Error parsing assignment file:', err)
      const errorResult = {
        success: false,
        error: err.message,
        fileName: file.name
      }
      setError(err.message)
      setLastResult(errorResult)
      setIsProcessing(false)
      return errorResult
    }
  }, [])

  // Convert parsed associates to the format needed for Firebase
  const convertToFirebaseFormat = useCallback((associates) => {
    const firebaseData = {}

    for (const associate of associates) {
      firebaseData[associate.employeeNumber] = {
        firstName: associate.firstName,
        lastName: associate.lastName,
        employeeNumber: associate.employeeNumber,
        startDate: associate.startDate,
        status: associate.status,
        addedDate: new Date().toISOString(),
        lastScan: null
      }
    }

    return firebaseData
  }, [])

  // Merge new associates with existing ones
  const mergeAssociates = useCallback((existing, newAssociates, options = {}) => {
    const {
      removeAbsent = false, // Remove associates not in new list
      updateExisting = true // Update existing associate data
    } = options

    const merged = { ...existing }
    const added = []
    const updated = []
    const removed = []

    // Track which employee numbers are in the new list
    const newEmployeeNumbers = new Set()

    for (const associate of newAssociates) {
      newEmployeeNumbers.add(associate.employeeNumber)

      if (merged[associate.employeeNumber]) {
        if (updateExisting) {
          // Update existing associate
          merged[associate.employeeNumber] = {
            ...merged[associate.employeeNumber],
            firstName: associate.firstName,
            lastName: associate.lastName,
            status: associate.status,
            startDate: associate.startDate,
            lastUpdated: new Date().toISOString()
          }
          updated.push(associate.employeeNumber)
        }
      } else {
        // Add new associate
        merged[associate.employeeNumber] = {
          firstName: associate.firstName,
          lastName: associate.lastName,
          employeeNumber: associate.employeeNumber,
          startDate: associate.startDate,
          status: associate.status,
          addedDate: new Date().toISOString(),
          lastScan: null
        }
        added.push(associate.employeeNumber)
      }
    }

    // Remove associates not in new list
    if (removeAbsent) {
      for (const employeeNumber of Object.keys(merged)) {
        if (!newEmployeeNumbers.has(employeeNumber)) {
          delete merged[employeeNumber]
          removed.push(employeeNumber)
        }
      }
    }

    return {
      merged,
      changes: {
        added,
        updated,
        removed
      }
    }
  }, [])

  return {
    parseFile,
    convertToFirebaseFormat,
    mergeAssociates,
    isProcessing,
    progress,
    error,
    lastResult
  }
}

// Helper function to read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Helper function to parse Excel date values
function parseExcelDate(value) {
  if (!value) return null

  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }

  // If it's a string
  if (typeof value === 'string') {
    // Try parsing as date string
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    return value
  }

  // If it's an Excel serial date number
  if (typeof value === 'number') {
    // Excel dates are days since December 30, 1899
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
    return date.toISOString().split('T')[0]
  }

  return null
}

export default useAssignmentParser
