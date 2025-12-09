import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import * as XLSX from 'xlsx'

import { useStaffing } from './contexts/StaffingContext'
import { useScanner } from './contexts/ScannerContext'

import { StaffingView } from './views/StaffingView'
import { SetupView } from './views/SetupView'
import { ReportsView } from './views/ReportsView'
import { CoreTeamView } from './views/CoreTeamView'
import { AssignmentsView } from './views/AssignmentsView'

import { ScanModeOverlay } from './components/scanner/ScanModeOverlay'
import { KioskMode } from './components/scanner/KioskMode'
import { ScannerButton } from './components/scanner/ScannerButton'
import { FirebaseStatus } from './components/common/FirebaseStatus'

function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const {
    lines,
    waitlist,
    currentDate,
    currentShift,
    setActiveTab,
    loadStaffingData,
    setCurrentDate,
    setCurrentShift,
    setLines,
    setWaitlist
  } = useStaffing()

  const { isKioskMode } = useScanner()

  // Determine active tab from route
  const getActiveTab = () => {
    const path = location.pathname
    if (path === '/staffing') return 'staffing'
    if (path === '/reports') return 'reports'
    if (path === '/core-team') return 'core'
    if (path === '/assignments') return 'assignments'
    return 'setup'
  }

  const activeTab = getActiveTab()

  const handleTabChange = (tab) => {
    const routes = {
      setup: '/',
      staffing: '/staffing',
      reports: '/reports',
      core: '/core-team',
      assignments: '/assignments'
    }
    navigate(routes[tab] || '/')
  }

  const handleLoadReport = async (date, shift) => {
    setCurrentDate(date)
    setCurrentShift(shift)
    await loadStaffingData(date, shift)
    navigate('/staffing')
  }

  const handleSetupComplete = () => {
    navigate('/staffing')
  }

  const handleExport = () => {
    const wb = XLSX.utils.book_new()

    const activeLines = lines.filter(line => !line.isCut)
    const cutLines = lines.filter(line => line.isCut)
    const totalPositions = activeLines.reduce((sum, line) => sum + line.needed, 0)
    const filledPositions = activeLines.reduce((sum, line) =>
      sum + line.positions.filter(p => p.name.trim()).length, 0
    )
    const newAssociates = activeLines.reduce((sum, line) =>
      sum + line.positions.filter(p => p.name.trim() && p.isNew).length, 0
    )

    const data = []
    data.push(['Crescent Staffing Planner'])
    data.push([`${currentDate} - ${currentShift} Shift`, '', '', '', `Exported: ${new Date().toLocaleString()}`])
    data.push([`${filledPositions} / ${totalPositions} filled`, `${newAssociates} new`, cutLines.length > 0 ? `${cutLines.length} cut` : '', waitlist.filter(w => w.name.trim()).length > 0 ? `${waitlist.filter(w => w.name.trim()).length} waiting` : ''])
    data.push([])

    const maxPositions = Math.max(...lines.map(l => l.positions.length), waitlist.length)

    const headerRow = []
    lines.forEach(line => {
      headerRow.push(`Line ${line.letter}${line.isCut ? ' (CUT)' : ''}`)
      headerRow.push('')
    })
    headerRow.push('WAITLIST')
    data.push(headerRow)

    const subheaderRow = []
    lines.forEach(line => {
      const leads = (line.leads || []).join(', ')
      subheaderRow.push(leads || 'No lead')
      subheaderRow.push('')
    })
    subheaderRow.push('')
    data.push(subheaderRow)

    for (let i = 0; i < maxPositions; i++) {
      const row = []
      lines.forEach(line => {
        const position = line.positions[i]
        if (position) {
          const name = position.name || ''
          const marker = position.isNew ? ' ⭐' : ''
          row.push(name + marker)
        } else {
          row.push('')
        }
        row.push('')
      })

      const waitlistItem = waitlist[i]
      if (waitlistItem) {
        const marker = waitlistItem.isNew ? ' ⭐' : ''
        row.push((waitlistItem.name || '') + marker)
      } else {
        row.push('')
      }

      data.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(data)

    const colWidths = []
    lines.forEach(() => {
      colWidths.push({ wch: 20 })
      colWidths.push({ wch: 2 })
    })
    colWidths.push({ wch: 20 })
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Staffing')
    XLSX.writeFile(wb, `staffing-${currentDate}-${currentShift}.xlsx`)
  }

  const handleClearAll = () => {
    if (confirm('Clear current shift data? This cannot be undone.')) {
      setLines([])
      setWaitlist([])
    }
  }

  // Render Kiosk Mode if active
  if (isKioskMode) {
    return <KioskMode />
  }

  return (
    <>
      <div className="container">
        <div className="header">
          <h1>Crescent Staffing Planner</h1>
          <div className="header-actions">
            <ScannerButton variant="header" />
            {lines.length > 0 && (
              <>
                <button className="btn btn-secondary" onClick={handleExport}>
                  Export
                </button>
                <button className="btn btn-danger" onClick={handleClearAll}>
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        <div className="content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'setup' ? 'active' : ''}`}
              onClick={() => handleTabChange('setup')}
            >
              Setup
            </button>
            <button
              className={`tab ${activeTab === 'staffing' ? 'active' : ''}`}
              onClick={() => handleTabChange('staffing')}
            >
              Staffing
            </button>
            <button
              className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleTabChange('reports')}
            >
              Reports
            </button>
            <button
              className={`tab ${activeTab === 'core' ? 'active' : ''}`}
              onClick={() => handleTabChange('core')}
            >
              Core Team
            </button>
            <button
              className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
              onClick={() => handleTabChange('assignments')}
            >
              Assignments
            </button>
          </div>

          <Routes>
            <Route path="/" element={<SetupView onSetupComplete={handleSetupComplete} />} />
            <Route path="/staffing" element={<StaffingView />} />
            <Route path="/reports" element={<ReportsView onLoadReport={handleLoadReport} />} />
            <Route path="/core-team" element={<CoreTeamView />} />
            <Route path="/assignments" element={<AssignmentsView />} />
          </Routes>
        </div>
      </div>

      <FirebaseStatus />
      <ScanModeOverlay />
    </>
  )
}

export default App
