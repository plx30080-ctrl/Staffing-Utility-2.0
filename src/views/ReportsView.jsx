import React, { useState, useEffect } from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { db, isFirebaseConfigured, loadData, DB_PATHS } from '../config/firebase'

export function ReportsView({ onLoadReport }) {
  const { storage } = useStaffing()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    setLoading(true)
    const reportsList = []
    const firebaseReportIds = new Set()

    // Load from Firebase
    if (isFirebaseConfigured && db) {
      try {
        const staffingData = await loadData(DB_PATHS.STAFFING)
        if (staffingData) {
          Object.keys(staffingData).forEach(docId => {
            const data = staffingData[docId]
            reportsList.push({ id: docId, ...data, syncedToCloud: true })
            firebaseReportIds.add(docId)
          })
        }
      } catch (error) {
        console.error('Error loading Firebase reports:', error)
      }
    }

    // Check localStorage
    const localKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('staffing_'))
      .filter(key => !key.includes('coreAssociates'))

    localKeys.forEach(key => {
      const data = storage.load(key)
      if (data) {
        const reportId = `${data.date}_${data.shift}`
        if (!reportsList.find(r => r.id === reportId)) {
          reportsList.push({ id: reportId, ...data, syncedToCloud: false })
        }
      }
    })

    // Sort by date
    reportsList.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return a.shift.localeCompare(b.shift)
    })

    setReports(reportsList)
    setLoading(false)
  }

  return (
    <div>
      <div className="report-controls">
        <h3 style={{ marginBottom: '8px' }}>Saved Staffing Reports</h3>
        <p style={{ fontSize: '12px', color: '#6b7280' }}>
          View and load previous staffing sheets
        </p>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <h3>No Reports Available</h3>
          <p>Staffing sheets will appear here after you save them.</p>
        </div>
      ) : (
        <div className="report-list">
          {reports.map(report => {
            const totalPositions = report.lines?.reduce((sum, line) => sum + line.needed, 0) || 0
            const filledPositions = report.lines?.reduce((sum, line) =>
              sum + line.positions.filter(p => p.name && p.name.trim()).length, 0
            ) || 0

            return (
              <div
                key={report.id}
                className="report-item"
                onClick={() => onLoadReport(report.date, report.shift)}
              >
                <h4>
                  {report.date} - {report.shift} Shift
                  {report.syncedToCloud ? (
                    <span className="cloud-badge synced">☁ Synced</span>
                  ) : (
                    <span className="cloud-badge local-only">📱 Local Only</span>
                  )}
                </h4>
                <p>
                  {filledPositions} / {totalPositions} positions filled
                  {report.waitlist && report.waitlist.length > 0 && (
                    <> • {report.waitlist.filter(w => w.name && w.name.trim()).length} waiting</>
                  )}
                </p>
                {report.lastUpdated && (
                  <p style={{ fontSize: '11px', marginTop: '4px' }}>
                    Last updated: {new Date(report.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ReportsView
