import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { db, isFirebaseConfigured, saveData, loadData, subscribeToData, DB_PATHS, ref, set, get } from '../config/firebase'

const StaffingContext = createContext(null)

// localStorage utilities
const storage = {
  save: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
  load: (key, defaultValue = null) => {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  },
  remove: (key) => localStorage.removeItem(key)
}

export function StaffingProvider({ children }) {
  const [activeTab, setActiveTab] = useState('setup')
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [currentShift, setCurrentShift] = useState('1st')
  const [lines, setLines] = useState([])
  const [waitlist, setWaitlist] = useState([])
  const [coreAssociates, setCoreAssociates] = useState({})
  const [activeAssociates, setActiveAssociates] = useState({})
  const [dailyAssignments, setDailyAssignments] = useState({}) // { employeeNumber: { line, leads, position, ... } }
  const [saveStatus, setSaveStatus] = useState('')
  const [firebaseStatus, setFirebaseStatus] = useState(isFirebaseConfigured ? 'connected' : 'offline')
  const [isLocked, setIsLocked] = useState(false)
  const saveTimeoutRef = useRef(null)
  const isLocalChangeRef = useRef(false) // Track if we're making local changes

  // Load core associates on mount
  useEffect(() => {
    const loadCoreAssociates = async () => {
      if (isFirebaseConfigured && db) {
        try {
          const data = await loadData(DB_PATHS.CORE_ASSOCIATES)
          if (data) {
            setCoreAssociates(data.associates || {})
            return
          }
        } catch (error) {
          console.error('Error loading core associates:', error)
        }
      }
      // Fallback to localStorage
      const savedCoreAssociates = storage.load('coreAssociates', {})
      setCoreAssociates(savedCoreAssociates)
    }
    loadCoreAssociates()
  }, [])

  // Load active associates on mount
  useEffect(() => {
    const loadActiveAssociates = async () => {
      if (isFirebaseConfigured && db) {
        try {
          const data = await loadData(DB_PATHS.ACTIVE_ASSOCIATES)
          if (data) {
            setActiveAssociates(data)
            return
          }
        } catch (error) {
          console.error('Error loading active associates:', error)
        }
      }
      // Fallback to localStorage
      const savedActiveAssociates = storage.load('activeAssociates', {})
      setActiveAssociates(savedActiveAssociates)
    }
    loadActiveAssociates()
  }, [])

  // Load daily assignments when date/shift changes
  useEffect(() => {
    const loadDailyAssignments = async () => {
      if (!currentDate || !currentShift) return

      if (isFirebaseConfigured && db) {
        try {
          const path = `${DB_PATHS.ASSIGNMENTS}/${currentDate}/${currentShift}`
          const data = await loadData(path)
          if (data) {
            setDailyAssignments(data)
            return
          }
        } catch (error) {
          console.error('Error loading daily assignments:', error)
        }
      }
      // Fallback to localStorage
      const key = `assignments_${currentDate}_${currentShift}`
      const savedAssignments = storage.load(key, {})
      setDailyAssignments(savedAssignments)
    }
    loadDailyAssignments()
  }, [currentDate, currentShift])

  // Subscribe to real-time waitlist updates
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !currentDate || !currentShift) return

    const docId = `${currentDate}_${currentShift}`
    const unsubscribe = subscribeToData(`${DB_PATHS.STAFFING}/${docId}`, (data) => {
      if (data && !isLocalChangeRef.current) {
        // Only update from remote if we're not currently making local changes
        if (data.waitlist) {
          setWaitlist(data.waitlist)
        }
        if (data.lines) {
          setLines(data.lines)
        }
        if (data.locked !== undefined) {
          setIsLocked(data.locked)
        }
      }
    })

    return () => unsubscribe()
  }, [currentDate, currentShift])

  // Save core associates
  useEffect(() => {
    storage.save('coreAssociates', coreAssociates)

    if (isFirebaseConfigured && db && Object.keys(coreAssociates).length > 0) {
      saveData(DB_PATHS.CORE_ASSOCIATES, {
        associates: coreAssociates,
        lastUpdated: new Date().toISOString()
      }).catch(console.error)
    }
  }, [coreAssociates])

  // Save active associates
  useEffect(() => {
    storage.save('activeAssociates', activeAssociates)

    if (isFirebaseConfigured && db && Object.keys(activeAssociates).length > 0) {
      saveData(DB_PATHS.ACTIVE_ASSOCIATES, activeAssociates).catch(console.error)
    }
  }, [activeAssociates])

  // Save daily assignments
  useEffect(() => {
    if (!currentDate || !currentShift) return

    const key = `assignments_${currentDate}_${currentShift}`
    storage.save(key, dailyAssignments)

    if (isFirebaseConfigured && db && Object.keys(dailyAssignments).length > 0) {
      const path = `${DB_PATHS.ASSIGNMENTS}/${currentDate}/${currentShift}`
      saveData(path, dailyAssignments).catch(console.error)
    }
  }, [dailyAssignments, currentDate, currentShift])

  // Auto-save functionality
  useEffect(() => {
    if (lines.length === 0) return

    // Mark that we're making local changes
    isLocalChangeRef.current = true

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleAutoSave()
      // Reset the local change flag after save completes
      setTimeout(() => {
        isLocalChangeRef.current = false
      }, 500)
    }, 2000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [lines, waitlist, currentDate, currentShift, isLocked])

  const handleAutoSave = async () => {
    const staffingData = {
      date: currentDate,
      shift: currentShift,
      lines: lines,
      waitlist: waitlist,
      locked: isLocked,
      lastUpdated: new Date().toISOString()
    }

    // Save to localStorage
    storage.save(`staffing_${currentDate}_${currentShift}`, staffingData)

    // Save to Firebase
    if (isFirebaseConfigured && db) {
      try {
        const docId = `${currentDate}_${currentShift}`
        await saveData(`${DB_PATHS.STAFFING}/${docId}`, staffingData)
        setSaveStatus('Saved to cloud')
        setFirebaseStatus('connected')
      } catch (error) {
        console.error('Firebase save error:', error)
        setFirebaseStatus('disconnected')
        setSaveStatus('Error saving')
      }
    } else {
      setSaveStatus('Saved locally')
    }

    setTimeout(() => setSaveStatus(''), 3000)
  }

  const loadStaffingData = useCallback(async (date, shift) => {
    // Try Firebase first
    if (isFirebaseConfigured && db) {
      try {
        const docId = `${date}_${shift}`
        const data = await loadData(`${DB_PATHS.STAFFING}/${docId}`)
        if (data) {
          setLines(data.lines || [])
          setWaitlist(data.waitlist || [])
          setIsLocked(data.locked || false)
          return
        }
      } catch (error) {
        console.error('Firebase load error:', error)
      }
    }

    // Fallback to localStorage
    const localData = storage.load(`staffing_${date}_${shift}`, null)
    if (localData) {
      setLines(localData.lines || [])
      setWaitlist(localData.waitlist || [])
      setIsLocked(localData.locked || false)
    } else {
      setLines([])
      setWaitlist([])
      setIsLocked(false)
    }
  }, [])

  // Add associate to active associates database
  const addActiveAssociate = useCallback((employeeNumber, associateData) => {
    setActiveAssociates(prev => ({
      ...prev,
      [employeeNumber]: {
        ...associateData,
        employeeNumber,
        addedDate: new Date().toISOString(),
        lastScan: null
      }
    }))
  }, [])

  // Remove associate from active associates
  const removeActiveAssociate = useCallback((employeeNumber) => {
    setActiveAssociates(prev => {
      const updated = { ...prev }
      delete updated[employeeNumber]
      return updated
    })
  }, [])

  // Bulk update active associates (for assignment uploads)
  const updateActiveAssociates = useCallback((newAssociates) => {
    setActiveAssociates(newAssociates)
  }, [])

  // Add a daily assignment
  const addDailyAssignment = useCallback((employeeNumber, assignmentData) => {
    setDailyAssignments(prev => ({
      ...prev,
      [employeeNumber]: {
        ...assignmentData,
        employeeNumber,
        assignedDate: new Date().toISOString()
      }
    }))
  }, [])

  // Remove a daily assignment
  const removeDailyAssignment = useCallback((employeeNumber) => {
    setDailyAssignments(prev => {
      const updated = { ...prev }
      delete updated[employeeNumber]
      return updated
    })
  }, [])

  // Bulk update daily assignments
  const updateDailyAssignments = useCallback((newAssignments) => {
    setDailyAssignments(newAssignments)
  }, [])

  // Get assignment for an employee
  const getAssignmentForEmployee = useCallback((employeeNumber) => {
    return dailyAssignments[employeeNumber] || null
  }, [dailyAssignments])

  // Clear all daily assignments for current shift
  const clearDailyAssignments = useCallback(() => {
    setDailyAssignments({})
  }, [])

  // Add to waitlist
  const addToWaitlist = useCallback((name, isNew = false, employeeNumber = null) => {
    const newItem = {
      id: Date.now() + Math.random(),
      name,
      isNew,
      employeeNumber,
      addedAt: new Date().toISOString()
    }
    setWaitlist(prev => {
      // Check for duplicates by employee number
      if (employeeNumber && prev.some(item => item.employeeNumber === employeeNumber)) {
        return prev // Don't add duplicate
      }
      return [...prev, newItem]
    })
    return newItem
  }, [])

  // Check if employee is already in waitlist or on a line
  const isEmployeeAlreadyPresent = useCallback((employeeNumber) => {
    // Check waitlist
    if (waitlist.some(item => item.employeeNumber === employeeNumber)) {
      return { present: true, location: 'waitlist' }
    }

    // Check all lines
    for (const line of lines) {
      for (const position of line.positions) {
        if (position.employeeNumber === employeeNumber) {
          return { present: true, location: `Line ${line.letter}`, position: position.name }
        }
      }
    }

    return { present: false }
  }, [waitlist, lines])

  const value = {
    // State
    activeTab,
    currentDate,
    currentShift,
    lines,
    waitlist,
    coreAssociates,
    activeAssociates,
    dailyAssignments,
    saveStatus,
    firebaseStatus,
    isLocked,
    isFirebaseConfigured,

    // Setters
    setActiveTab,
    setCurrentDate,
    setCurrentShift,
    setLines,
    setWaitlist,
    setCoreAssociates,
    setIsLocked,

    // Methods
    loadStaffingData,
    addActiveAssociate,
    removeActiveAssociate,
    updateActiveAssociates,
    addDailyAssignment,
    removeDailyAssignment,
    updateDailyAssignments,
    getAssignmentForEmployee,
    clearDailyAssignments,
    addToWaitlist,
    isEmployeeAlreadyPresent,

    // Storage utilities
    storage
  }

  return (
    <StaffingContext.Provider value={value}>
      {children}
    </StaffingContext.Provider>
  )
}

export function useStaffing() {
  const context = useContext(StaffingContext)
  if (!context) {
    throw new Error('useStaffing must be used within a StaffingProvider')
  }
  return context
}

export default StaffingContext
