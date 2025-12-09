import React, { useState, useRef, useEffect } from 'react'
import { useScanner } from '../../contexts/ScannerContext'
import '../../styles/scanner.css'

export function ScanModeOverlay() {
  const {
    isScanModeActive,
    toggleScanMode,
    scanResult,
    scanHistory,
    manualScan,
    isProcessing
  } = useScanner()

  const [manualInput, setManualInput] = useState('')
  const inputRef = useRef(null)

  // Focus management
  useEffect(() => {
    if (isScanModeActive && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isScanModeActive, scanResult])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualInput.trim()) {
      manualScan(manualInput.trim())
      setManualInput('')
    }
  }

  if (!isScanModeActive) return null

  return (
    <div className="scan-mode-overlay">
      {/* Header */}
      <div className="scan-mode-header">
        <div className="scan-mode-title">
          <div className="scan-mode-indicator" />
          Scan Mode Active
        </div>
        <button
          className="btn btn-danger"
          onClick={toggleScanMode}
        >
          Exit Scan Mode
        </button>
      </div>

      {/* Main Content */}
      <div className="scan-mode-content">
        {scanResult ? (
          <ScanResultDisplay result={scanResult} />
        ) : (
          <>
            <div className="scan-icon">📷</div>
            <div className="scan-prompt">Scan a badge...</div>

            {/* Manual Input */}
            <div className="manual-scan-section">
              <form onSubmit={handleManualSubmit}>
                <input
                  ref={inputRef}
                  type="text"
                  className="manual-scan-input"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Or type employee number..."
                  disabled={isProcessing}
                />
              </form>
            </div>
          </>
        )}
      </div>

      {/* Scan History */}
      {scanHistory.length > 0 && !scanResult && (
        <div className="scan-history">
          <div className="scan-history-title">Recent Scans</div>
          <div className="scan-history-list">
            {scanHistory.slice(0, 10).map((scan, index) => (
              <div
                key={index}
                className={`scan-history-item ${scan.status}`}
              >
                <span>
                  {scan.associate
                    ? `${scan.associate.firstName} ${scan.associate.lastName}`
                    : scan.employeeNumber || 'Unknown'}
                </span>
                <span style={{ opacity: 0.6, fontSize: '10px' }}>
                  {new Date(scan.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScanResultDisplay({ result }) {
  const statusClass = result.status === 'added' || result.status === 'duplicate'
    ? 'success'
    : result.status === 'unknown'
    ? 'error'
    : 'error'

  const icon = result.status === 'added'
    ? '✓'
    : result.status === 'duplicate'
    ? '↩'
    : result.status === 'unknown'
    ? '?'
    : '✗'

  return (
    <div className={`scan-result ${statusClass}`}>
      <div className={`scan-result-icon ${statusClass}`}>
        {icon}
      </div>

      {result.associate ? (
        <>
          <div className="scan-result-name">
            {result.associate.firstName} {result.associate.lastName}
          </div>
          <div className="scan-result-id">
            Employee #{result.employeeNumber}
          </div>
        </>
      ) : (
        <div className="scan-result-name">
          Unknown Badge
        </div>
      )}

      <div className="scan-result-message">
        {result.message}
      </div>

      {result.lineAssignment && (
        <div className="scan-result-assignment">
          <h4>Your Assignment</h4>
          <div className="line">Line {result.lineAssignment.line}</div>
          {result.lineAssignment.leads.length > 0 && (
            <div className="leads">
              Lead(s): {result.lineAssignment.leads.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScanModeOverlay
