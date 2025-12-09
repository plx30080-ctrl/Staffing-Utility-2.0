import React, { useState, useRef, useMemo } from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { useAssignmentParser } from '../hooks/useAssignmentParser'
import * as assignmentService from '../services/assignmentService'
import '../styles/assignments.css'

export function AssignmentsView() {
  const {
    activeAssociates,
    dailyAssignments,
    updateActiveAssociates,
    addActiveAssociate,
    removeActiveAssociate,
    addDailyAssignment,
    removeDailyAssignment,
    updateDailyAssignments,
    currentDate,
    currentShift,
    lines
  } = useStaffing()

  const {
    parseFile,
    convertToFirebaseFormat,
    mergeAssociates,
    isProcessing,
    progress,
    error,
    lastResult
  } = useAssignmentParser()

  const [activeView, setActiveView] = useState('associates') // 'associates' | 'daily-assignments'
  const [searchQuery, setSearchQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mergeOptions, setMergeOptions] = useState({
    removeAbsent: true,
    updateExisting: true
  })

  // Manual add form
  const [manualFirstName, setManualFirstName] = useState('')
  const [manualLastName, setManualLastName] = useState('')
  const [manualEmployeeNumber, setManualEmployeeNumber] = useState('')

  // Daily assignment editing
  const [editingAssignment, setEditingAssignment] = useState(null) // { employeeNumber, line, leads }
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedLeads, setSelectedLeads] = useState([])

  const fileInputRef = useRef(null)

  // Get unassigned associates
  const unassignedAssociates = useMemo(() => {
    return assignmentService.getUnassignedAssociates(activeAssociates, dailyAssignments)
  }, [activeAssociates, dailyAssignments])

  // Get assigned associates grouped by line
  const assignmentsByLine = useMemo(() => {
    const byLine = {}
    for (const line of lines) {
      byLine[line.letter] = assignmentService.getAssociatesByLine(dailyAssignments, line.letter)
    }
    return byLine
  }, [dailyAssignments, lines])

  const handleFileSelect = async (file) => {
    if (!file) return

    const result = await parseFile(file)

    if (result.success) {
      setShowResults(true)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.xls') || file.name.endsWith('.xlsx'))) {
      handleFileSelect(file)
    } else {
      alert('Please drop an Excel file (.xls or .xlsx)')
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleApplyChanges = () => {
    if (!lastResult?.associates) return

    const { merged, changes } = mergeAssociates(
      activeAssociates,
      lastResult.associates,
      mergeOptions
    )

    updateActiveAssociates(merged)

    alert(
      `Changes applied!\n\n` +
      `Added: ${changes.added.length}\n` +
      `Updated: ${changes.updated.length}\n` +
      `Removed: ${changes.removed.length}`
    )

    setShowResults(false)
  }

  const handleManualAdd = (e) => {
    e.preventDefault()

    if (!manualFirstName || !manualLastName || !manualEmployeeNumber) {
      alert('Please fill in all fields')
      return
    }

    const cleanedNumber = manualEmployeeNumber.replace(/\D/g, '')
    if (cleanedNumber.length < 6) {
      alert('Employee number must be at least 6 digits')
      return
    }

    addActiveAssociate(cleanedNumber, {
      firstName: manualFirstName,
      lastName: manualLastName,
      status: 'Active'
    })

    setManualFirstName('')
    setManualLastName('')
    setManualEmployeeNumber('')

    alert(`Added ${manualFirstName} ${manualLastName} (${cleanedNumber})`)
  }

  // Assign associate to a line
  const handleAssignToLine = (employeeNumber, lineLetter) => {
    const associate = activeAssociates[employeeNumber]
    if (!associate) {
      alert('Associate not found')
      return
    }

    const line = lines.find(l => l.letter === lineLetter)
    if (!line) {
      alert('Line not found')
      return
    }

    addDailyAssignment(employeeNumber, {
      firstName: associate.firstName,
      lastName: associate.lastName,
      line: lineLetter,
      leads: line.leads || [],
      position: null
    })
  }

  // Remove assignment
  const handleRemoveAssignment = (employeeNumber) => {
    removeDailyAssignment(employeeNumber)
  }

  // Bulk assign unassigned associates
  const handleBulkAssign = () => {
    if (unassignedAssociates.length === 0) {
      alert('No unassigned associates to assign')
      return
    }

    if (lines.length === 0) {
      alert('No lines configured. Please go to Setup and create lines first.')
      return
    }

    // Simple round-robin assignment
    const updates = { ...dailyAssignments }
    let lineIndex = 0

    for (const associate of unassignedAssociates) {
      const line = lines[lineIndex % lines.length]
      updates[associate.employeeNumber] = assignmentService.createAssignment(
        associate.employeeNumber,
        {
          firstName: associate.firstName,
          lastName: associate.lastName,
          line: line.letter,
          leads: line.leads || []
        }
      )
      lineIndex++
    }

    updateDailyAssignments(updates)
    alert(`Assigned ${unassignedAssociates.length} associates across ${lines.length} lines`)
  }

  // Clear all daily assignments
  const handleClearAssignments = () => {
    if (confirm('Clear all daily assignments for this shift? This cannot be undone.')) {
      updateDailyAssignments({})
    }
  }

  // Filter active associates
  const filteredAssociates = Object.entries(activeAssociates).filter(([id, assoc]) => {
    if (!searchQuery.trim()) return true
    const fullName = `${assoc.firstName} ${assoc.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) ||
           id.includes(searchQuery)
  })

  return (
    <div className="assignments-view">
      <div className="assignments-header">
        <h2>Assignment Management</h2>
        <p>
          Manage active associates and daily line assignments for {currentDate} - {currentShift} Shift.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="assignment-tabs">
        <button
          className={`tab-btn ${activeView === 'associates' ? 'active' : ''}`}
          onClick={() => setActiveView('associates')}
        >
          Active Associates ({Object.keys(activeAssociates).length})
        </button>
        <button
          className={`tab-btn ${activeView === 'daily-assignments' ? 'active' : ''}`}
          onClick={() => setActiveView('daily-assignments')}
        >
          Daily Assignments ({Object.keys(dailyAssignments).length})
        </button>
      </div>

      {/* Active Associates View */}
      {activeView === 'associates' && (
        <div className="associates-tab">

      {/* Upload Section */}
      <div
        className={`upload-section ${isDragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="upload-icon">📤</div>
        <div className="upload-title">Upload Assignment List</div>
        <div className="upload-hint">
          Drag and drop an Excel file (.xls, .xlsx) or click to browse
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="upload-input"
          accept=".xls,.xlsx"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />

        <label
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose File
        </label>

        {isProcessing && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-text">Processing... {progress}%</div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: '16px', color: '#ef4444', fontSize: '14px' }}>
            Error: {error}
          </div>
        )}
      </div>

      {/* Upload Results */}
      {showResults && lastResult?.success && (
        <div className="upload-results">
          <h4>Upload Results: {lastResult.fileName}</h4>

          <div className="upload-stats">
            <div className="stat-card success">
              <div className="stat-number">{lastResult.associates.length}</div>
              <div className="stat-label">Associates Found</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">{lastResult.skipped.length}</div>
              <div className="stat-label">Skipped (Inactive)</div>
            </div>
            <div className="stat-card error">
              <div className="stat-number">{lastResult.errors.length}</div>
              <div className="stat-label">Errors</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={mergeOptions.removeAbsent}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, removeAbsent: e.target.checked }))}
              />
              Remove associates not in new list
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={mergeOptions.updateExisting}
                onChange={(e) => setMergeOptions(prev => ({ ...prev, updateExisting: e.target.checked }))}
              />
              Update existing associate information
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-success" onClick={handleApplyChanges}>
              Apply Changes
            </button>
            <button className="btn btn-secondary" onClick={() => setShowResults(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual Add Form */}
      <div className="manual-add-form">
        <h4>Add Associate Manually</h4>
        <form onSubmit={handleManualAdd}>
          <div className="manual-add-grid">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={manualFirstName}
                onChange={(e) => setManualFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input
                type="text"
                value={manualLastName}
                onChange={(e) => setManualLastName(e.target.value)}
                placeholder="Smith"
                required
              />
            </div>
            <div className="form-group">
              <label>Employee Number *</label>
              <input
                type="text"
                value={manualEmployeeNumber}
                onChange={(e) => setManualEmployeeNumber(e.target.value)}
                placeholder="12345678"
                required
              />
            </div>
          </div>
          <button type="submit" className="btn btn-success">
            + Add Associate
          </button>
        </form>
      </div>

      {/* Email Automation Note */}
      <div className="email-automation">
        <h4>
          <span className="email-automation-badge">Coming Soon</span>
          Email Automation
        </h4>
        <p>
          Future versions will support automatic assignment list updates from emailed files.
          You'll be able to configure an email address that receives daily assignment lists
          and automatically updates the active associates database.
        </p>
      </div>

      {/* Active Associates List */}
      <div className="associates-section">
        <div className="associates-header">
          <h3>Active Associates</h3>
          <span className="associates-count">{Object.keys(activeAssociates).length}</span>
        </div>

        <div className="associates-search">
          <input
            type="text"
            placeholder="Search by name or employee number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="associates-list">
          {filteredAssociates.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {searchQuery ? 'No associates match your search' : 'No active associates yet'}
            </div>
          ) : (
            filteredAssociates.map(([id, assoc]) => (
              <div key={id} className="associate-item">
                <div className="associate-info">
                  <div className="associate-avatar">
                    {assoc.firstName?.[0]}{assoc.lastName?.[0]}
                  </div>
                  <div className="associate-details">
                    <div className="associate-name">
                      {assoc.firstName} {assoc.lastName}
                    </div>
                    <div className="associate-id">#{id}</div>
                  </div>
                </div>
                <div className="associate-status">
                  <span className={`status-badge ${assoc.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                    {assoc.status || 'Active'}
                  </span>
                  <div className="associate-actions">
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => {
                        if (confirm(`Remove ${assoc.firstName} ${assoc.lastName}?`)) {
                          removeActiveAssociate(id)
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </div>
      )}

      {/* Daily Assignments View */}
      {activeView === 'daily-assignments' && (
        <div className="daily-assignments-tab">

          {/* Summary Stats */}
          <div className="assignment-stats">
            <div className="stat-card">
              <div className="stat-number">{Object.keys(dailyAssignments).length}</div>
              <div className="stat-label">Assigned</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-number">{unassignedAssociates.length}</div>
              <div className="stat-label">Unassigned</div>
            </div>
            <div className="stat-card info">
              <div className="stat-number">{lines.length}</div>
              <div className="stat-label">Lines</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="assignment-actions">
            <button
              className="btn btn-success"
              onClick={handleBulkAssign}
              disabled={unassignedAssociates.length === 0 || lines.length === 0}
            >
              Auto-Assign All ({unassignedAssociates.length})
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleClearAssignments}
              disabled={Object.keys(dailyAssignments).length === 0}
            >
              Clear All Assignments
            </button>
          </div>

          {/* Unassigned Associates */}
          {unassignedAssociates.length > 0 && (
            <div className="unassigned-section">
              <h3>Unassigned Associates ({unassignedAssociates.length})</h3>
              <div className="unassigned-list">
                {unassignedAssociates.map(associate => (
                  <div key={associate.employeeNumber} className="unassigned-item">
                    <div className="associate-info">
                      <div className="associate-avatar">
                        {associate.firstName?.[0]}{associate.lastName?.[0]}
                      </div>
                      <div className="associate-details">
                        <div className="associate-name">
                          {associate.firstName} {associate.lastName}
                        </div>
                        <div className="associate-id">#{associate.employeeNumber}</div>
                      </div>
                    </div>
                    <div className="assign-controls">
                      <label style={{ fontSize: '12px', marginRight: '8px' }}>Assign to:</label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignToLine(associate.employeeNumber, e.target.value)
                            e.target.value = ''
                          }
                        }}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        <option value="">Select Line...</option>
                        {lines.map(line => (
                          <option key={line.letter} value={line.letter}>
                            Line {line.letter} ({line.leads?.join(', ') || 'No leads'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments by Line */}
          {lines.length > 0 ? (
            <div className="assignments-by-line">
              <h3>Assignments by Line</h3>
              {lines.map(line => {
                const assigned = assignmentsByLine[line.letter] || []
                return (
                  <div key={line.letter} className="line-assignment-section">
                    <div className="line-header">
                      <h4>
                        Line {line.letter}
                        <span className="line-count">({assigned.length} assigned)</span>
                      </h4>
                      <div className="line-leads">
                        Leads: {line.leads?.join(', ') || 'None'}
                      </div>
                    </div>

                    {assigned.length > 0 ? (
                      <div className="assigned-list">
                        {assigned.map(assignment => (
                          <div key={assignment.employeeNumber} className="assigned-item">
                            <div className="associate-info">
                              <div className="associate-avatar">
                                {assignment.firstName?.[0]}{assignment.lastName?.[0]}
                              </div>
                              <div className="associate-details">
                                <div className="associate-name">
                                  {assignment.firstName} {assignment.lastName}
                                </div>
                                <div className="associate-id">#{assignment.employeeNumber}</div>
                              </div>
                            </div>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleRemoveAssignment(assignment.employeeNumber)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        No associates assigned to this line
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              <p>No lines configured. Please go to the <strong>Setup</strong> tab to create lines first.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

export default AssignmentsView
