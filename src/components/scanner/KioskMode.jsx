import React, { useState, useEffect, useRef } from 'react'
import { useScanner } from '../../contexts/ScannerContext'
import { useStaffing } from '../../contexts/StaffingContext'
import '../../styles/scanner.css'

export function KioskMode() {
  const {
    isKioskMode,
    toggleKioskMode,
    scanResult,
    manualScan,
    isProcessing,
    audioEnabled,
    setAudioEnabled
  } = useScanner()

  const { lines, currentDate, currentShift } = useStaffing()

  const [currentTime, setCurrentTime] = useState(new Date())
  const [showStaffingView, setShowStaffingView] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const inputRef = useRef(null)

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Focus management
  useEffect(() => {
    if (isKioskMode && inputRef.current && !scanResult) {
      inputRef.current.focus()
    }
  }, [isKioskMode, scanResult])

  // Refocus after scan result clears
  useEffect(() => {
    if (!scanResult && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [scanResult])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualInput.trim()) {
      manualScan(manualInput.trim())
      setManualInput('')
    }
  }

  if (!isKioskMode) return null

  return (
    <div className="kiosk-mode">
      {/* Header */}
      <div className="kiosk-header">
        <div className="kiosk-logo">Crescent Staffing</div>
        <div className="kiosk-time">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Main Content */}
      <div className="kiosk-main">
        {showStaffingView ? (
          <KioskStaffingView
            lines={lines}
            currentDate={currentDate}
            currentShift={currentShift}
            onBack={() => setShowStaffingView(false)}
          />
        ) : scanResult ? (
          <KioskResultDisplay result={scanResult} />
        ) : (
          <div className="kiosk-scan-area">
            <div className="kiosk-scan-icon">📷</div>
            <div className="kiosk-scan-prompt">Scan Your Badge</div>
            <div className="kiosk-scan-hint">
              Hold your badge up to the scanner
            </div>

            {/* Hidden input for scanner */}
            <form onSubmit={handleManualSubmit} style={{ marginTop: '20px' }}>
              <input
                ref={inputRef}
                type="text"
                className="manual-scan-input"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Manual entry..."
                disabled={isProcessing}
                style={{ opacity: 0.5 }}
              />
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="kiosk-footer">
        <div>
          {currentDate} • {currentShift} Shift
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="kiosk-audio-toggle"
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? 'Mute audio' : 'Enable audio'}
            style={{
              background: audioEnabled ? '#10b981' : '#6b7280',
              border: 'none',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {audioEnabled ? '🔊' : '🔇'}
          </button>
          <button
            className="kiosk-exit-btn"
            onClick={() => setShowStaffingView(!showStaffingView)}
          >
            {showStaffingView ? 'Back to Scan' : 'View Staffing'}
          </button>
          <button
            className="kiosk-exit-btn"
            onClick={toggleKioskMode}
          >
            Exit Kiosk
          </button>
        </div>
      </div>
    </div>
  )
}

function KioskResultDisplay({ result }) {
  const statusClass = result.status === 'added' || result.status === 'duplicate'
    ? 'success'
    : 'error'

  const icon = result.status === 'added'
    ? '✓'
    : result.status === 'duplicate'
    ? '✓'
    : '?'

  return (
    <div className={`kiosk-result ${statusClass}`}>
      <div className={`scan-result-icon ${statusClass}`} style={{ fontSize: '100px' }}>
        {icon}
      </div>

      {result.associate ? (
        <>
          <div className="kiosk-result-name">
            {result.associate.firstName} {result.associate.lastName}
          </div>
          <div className="kiosk-result-id">
            Employee #{result.employeeNumber}
          </div>
        </>
      ) : (
        <div className="kiosk-result-name">
          Unknown Badge
        </div>
      )}

      <div className="kiosk-result-message">
        {result.message?.split('\n')[0]}
      </div>

      {(result.dailyAssignment || result.lineAssignment) && (
        <div className="kiosk-assignment">
          <h4>Your Assignment</h4>
          <div className="line">
            Line {(result.dailyAssignment || result.lineAssignment).line}
          </div>
          {(result.dailyAssignment || result.lineAssignment).leads?.length > 0 && (
            <div className="leads">
              Lead(s): {(result.dailyAssignment || result.lineAssignment).leads.join(', ')}
            </div>
          )}
          {result.dailyAssignment && (
            <div style={{
              marginTop: '10px',
              fontSize: '14px',
              color: '#059669',
              fontWeight: '600'
            }}>
              ✓ Pre-assigned for today's shift
            </div>
          )}
        </div>
      )}

      {!result.associate && (
        <div style={{
          marginTop: '30px',
          padding: '20px',
          background: '#fef3c7',
          borderRadius: '12px',
          color: '#92400e'
        }}>
          Please see the SPM for assistance
        </div>
      )}
    </div>
  )
}

function KioskStaffingView({ lines, currentDate, currentShift, onBack }) {
  const activeLines = lines.filter(line => !line.isCut)

  return (
    <div className="kiosk-staffing-view">
      <div className="kiosk-staffing-header">
        <h2>Today's Staffing</h2>
        <p>{currentDate} • {currentShift} Shift</p>
      </div>

      <div className="kiosk-lines-grid">
        {activeLines.map(line => (
          <div key={line.id} className="kiosk-line-card">
            <div className="kiosk-line-header">
              <h3>Line {line.letter}</h3>
              <p>{(line.leads || []).join(', ') || 'No lead'}</p>
            </div>
            <div className="kiosk-line-positions">
              {line.positions.map((position, idx) => (
                <div
                  key={position.id}
                  className={`kiosk-position ${position.name.trim() ? 'filled' : 'empty'}`}
                >
                  <span className="kiosk-position-number">{idx + 1}</span>
                  <span className="kiosk-position-name">
                    {position.name.trim() || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeLines.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px',
          color: '#9ca3af'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
          <p>No staffing data available</p>
        </div>
      )}
    </div>
  )
}

export default KioskMode
