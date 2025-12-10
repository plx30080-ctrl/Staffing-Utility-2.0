import React, { useState, useEffect } from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { loadAssignments } from '../services/assignmentService'
import '../styles/assignments.css'

export function AssignmentHistoryView() {
  const { currentDate, currentShift, lines } = useStaffing()
  const [selectedDate, setSelectedDate] = useState(currentDate)
  const [selectedShift, setSelectedShift] = useState(currentShift)
  const [historyData, setHistoryData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dateRange, setDateRange] = useState(7) // days

  // Generate recent dates
  const recentDates = []
  for (let i = 0; i < dateRange; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    recentDates.push(date.toISOString().split('T')[0])
  }

  useEffect(() => {
    loadHistoricalData()
  }, [selectedDate, selectedShift])

  const loadHistoricalData = async () => {
    setIsLoading(true)
    try {
      const data = await loadAssignments(selectedDate, selectedShift)
      setHistoryData(data)
    } catch (error) {
      console.error('Error loading history:', error)
      setHistoryData(null)
    }
    setIsLoading(false)
  }

  const groupByLine = (assignments) => {
    const grouped = {}
    for (const [empNum, assignment] of Object.entries(assignments)) {
      const line = assignment.line
      if (!grouped[line]) {
        grouped[line] = []
      }
      grouped[line].push({ ...assignment, employeeNumber: empNum })
    }
    return grouped
  }

  const exportToCSV = () => {
    if (!historyData || Object.keys(historyData).length === 0) return

    const rows = [['Line', 'Employee Number', 'First Name', 'Last Name', 'Leads']]

    const grouped = groupByLine(historyData)
    for (const [line, associates] of Object.entries(grouped).sort()) {
      for (const assoc of associates) {
        rows.push([
          line,
          assoc.employeeNumber,
          assoc.firstName,
          assoc.lastName,
          (assoc.leads || []).join('; ')
        ])
      }
    }

    const csv = rows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `assignments_${selectedDate}_${selectedShift}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const printAssignments = () => {
    window.print()
  }

  return (
    <div className="assignment-history-view">
      <div className="history-header">
        <h2>Assignment History</h2>
        <p>View past daily assignments by date and shift</p>
      </div>

      {/* Date/Shift Selector */}
      <div className="history-controls">
        <div className="control-group">
          <label>Date</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="history-select"
          >
            {recentDates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Shift</label>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="history-select"
          >
            <option value="1st">1st Shift</option>
            <option value="2nd">2nd Shift</option>
            <option value="3rd">3rd Shift</option>
          </select>
        </div>

        <div className="control-group">
          <label>Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="history-select"
          >
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        <div className="control-actions">
          <button
            className="btn btn-secondary btn-small"
            onClick={exportToCSV}
            disabled={!historyData || Object.keys(historyData).length === 0}
          >
            Export CSV
          </button>
          <button
            className="btn btn-secondary btn-small"
            onClick={printAssignments}
            disabled={!historyData || Object.keys(historyData).length === 0}
          >
            Print
          </button>
        </div>
      </div>

      {/* History Content */}
      <div className="history-content" id="printable-assignments">
        {isLoading ? (
          <div className="history-loading">
            <div className="loading-spinner" />
            <p>Loading assignments...</p>
          </div>
        ) : historyData && Object.keys(historyData).length > 0 ? (
          <>
            <div className="history-summary">
              <h3>{selectedDate} - {selectedShift} Shift</h3>
              <p>{Object.keys(historyData).length} associates assigned</p>
            </div>

            <div className="history-assignments">
              {Object.entries(groupByLine(historyData)).sort().map(([line, associates]) => (
                <div key={line} className="history-line-section">
                  <div className="history-line-header">
                    <h4>Line {line}</h4>
                    <span className="history-line-count">
                      {associates.length} {associates.length === 1 ? 'associate' : 'associates'}
                    </span>
                  </div>
                  <div className="history-associates-list">
                    {associates.map((assoc) => (
                      <div key={assoc.employeeNumber} className="history-associate-item">
                        <div className="history-associate-info">
                          <div className="history-associate-name">
                            {assoc.firstName} {assoc.lastName}
                          </div>
                          <div className="history-associate-details">
                            #{assoc.employeeNumber}
                            {assoc.leads && assoc.leads.length > 0 && (
                              <span className="history-leads">
                                • Leads: {assoc.leads.join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="history-empty">
            <div className="empty-icon">📋</div>
            <h3>No assignments found</h3>
            <p>No assignment data available for {selectedDate} - {selectedShift} Shift</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AssignmentHistoryView
