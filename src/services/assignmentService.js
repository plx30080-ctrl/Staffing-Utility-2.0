import { db, isFirebaseConfigured, saveData, loadData, DB_PATHS } from '../config/firebase'

/**
 * Assignment Service
 * Manages daily line assignments for associates
 */

/**
 * Load assignments for a specific date and shift
 */
export async function loadAssignments(date, shift) {
  if (!date || !shift) {
    throw new Error('Date and shift are required')
  }

  if (isFirebaseConfigured && db) {
    try {
      const path = `${DB_PATHS.ASSIGNMENTS}/${date}/${shift}`
      const data = await loadData(path)
      return data || {}
    } catch (error) {
      console.error('Error loading assignments from Firebase:', error)
    }
  }

  // Fallback to localStorage
  const key = `assignments_${date}_${shift}`
  const data = localStorage.getItem(key)
  return data ? JSON.parse(data) : {}
}

/**
 * Save assignments for a specific date and shift
 */
export async function saveAssignments(date, shift, assignments) {
  if (!date || !shift) {
    throw new Error('Date and shift are required')
  }

  // Save to localStorage
  const key = `assignments_${date}_${shift}`
  localStorage.setItem(key, JSON.stringify(assignments))

  // Save to Firebase
  if (isFirebaseConfigured && db) {
    try {
      const path = `${DB_PATHS.ASSIGNMENTS}/${date}/${shift}`
      await saveData(path, assignments)
      return true
    } catch (error) {
      console.error('Error saving assignments to Firebase:', error)
      return false
    }
  }

  return true
}

/**
 * Create an assignment object
 */
export function createAssignment(employeeNumber, assignmentData) {
  const { firstName, lastName, line, leads = [], position = null } = assignmentData

  return {
    employeeNumber,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`,
    line,
    leads: Array.isArray(leads) ? leads : [leads],
    position,
    assignedDate: new Date().toISOString()
  }
}

/**
 * Parse assignments from Excel data and create assignment objects
 */
export function parseAssignmentsFromExcel(parsedData, lineMapping = {}) {
  const assignments = {}

  for (const associate of parsedData) {
    const { employeeNumber, firstName, lastName } = associate

    // Check if there's a line mapping for this associate
    const assignedLine = lineMapping[employeeNumber]

    if (assignedLine) {
      assignments[employeeNumber] = createAssignment(employeeNumber, {
        firstName,
        lastName,
        line: assignedLine.line,
        leads: assignedLine.leads || [],
        position: assignedLine.position || null
      })
    }
  }

  return assignments
}

/**
 * Get all associates with assignments
 */
export function getAssignedAssociates(assignments) {
  return Object.entries(assignments).map(([employeeNumber, assignment]) => ({
    employeeNumber,
    ...assignment
  }))
}

/**
 * Get associates assigned to a specific line
 */
export function getAssociatesByLine(assignments, lineLetter) {
  return Object.entries(assignments)
    .filter(([_, assignment]) => assignment.line === lineLetter)
    .map(([employeeNumber, assignment]) => ({
      employeeNumber,
      ...assignment
    }))
}

/**
 * Get unassigned associates (in active list but no assignment)
 */
export function getUnassignedAssociates(activeAssociates, assignments) {
  const unassigned = []

  for (const [employeeNumber, associate] of Object.entries(activeAssociates)) {
    if (!assignments[employeeNumber]) {
      unassigned.push({
        employeeNumber,
        ...associate
      })
    }
  }

  return unassigned
}

/**
 * Assign an associate to a line
 */
export function assignToLine(assignments, employeeNumber, lineData, associateInfo) {
  const { firstName, lastName } = associateInfo
  const { line, leads = [], position = null } = lineData

  return {
    ...assignments,
    [employeeNumber]: createAssignment(employeeNumber, {
      firstName,
      lastName,
      line,
      leads,
      position
    })
  }
}

/**
 * Remove assignment for an associate
 */
export function removeAssignment(assignments, employeeNumber) {
  const updated = { ...assignments }
  delete updated[employeeNumber]
  return updated
}

/**
 * Move assignment to a different line
 */
export function reassignToLine(assignments, employeeNumber, newLine, newLeads = []) {
  if (!assignments[employeeNumber]) {
    throw new Error(`No assignment found for employee ${employeeNumber}`)
  }

  return {
    ...assignments,
    [employeeNumber]: {
      ...assignments[employeeNumber],
      line: newLine,
      leads: Array.isArray(newLeads) ? newLeads : [newLeads],
      reassignedDate: new Date().toISOString()
    }
  }
}

/**
 * Get assignment history for a date range
 */
export async function getAssignmentHistory(startDate, endDate) {
  const history = []

  if (!isFirebaseConfigured || !db) {
    console.warn('Firebase not configured, history limited to localStorage')
    return history
  }

  try {
    // This would require listing all dates in the range
    // For now, return empty array
    // In a full implementation, you'd query Firebase for the date range
    return history
  } catch (error) {
    console.error('Error loading assignment history:', error)
    return history
  }
}

/**
 * Archive old assignments (move to archive path)
 */
export async function archiveAssignments(date, shift) {
  if (!isFirebaseConfigured || !db) {
    console.warn('Firebase not configured, cannot archive to cloud')
    return false
  }

  try {
    const sourcePath = `${DB_PATHS.ASSIGNMENTS}/${date}/${shift}`
    const archivePath = `${DB_PATHS.ASSIGNMENTS}/archive/${date}/${shift}`

    const data = await loadData(sourcePath)
    if (data) {
      await saveData(archivePath, {
        ...data,
        archivedDate: new Date().toISOString()
      })
      return true
    }
    return false
  } catch (error) {
    console.error('Error archiving assignments:', error)
    return false
  }
}

/**
 * Validate assignment data
 */
export function validateAssignment(assignment) {
  const errors = []

  if (!assignment.employeeNumber) {
    errors.push('Employee number is required')
  }

  if (!assignment.firstName || !assignment.lastName) {
    errors.push('First and last name are required')
  }

  if (!assignment.line) {
    errors.push('Line assignment is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  loadAssignments,
  saveAssignments,
  createAssignment,
  parseAssignmentsFromExcel,
  getAssignedAssociates,
  getAssociatesByLine,
  getUnassignedAssociates,
  assignToLine,
  removeAssignment,
  reassignToLine,
  getAssignmentHistory,
  archiveAssignments,
  validateAssignment
}
