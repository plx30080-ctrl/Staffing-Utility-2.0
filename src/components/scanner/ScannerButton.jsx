import React from 'react'
import { useScanner } from '../../contexts/ScannerContext'

export function ScannerButton({ variant = 'header' }) {
  const { isScanModeActive, toggleScanMode, setIsKioskMode } = useScanner()

  if (variant === 'header') {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className={`btn btn-scanner ${isScanModeActive ? 'active' : ''}`}
          onClick={toggleScanMode}
        >
          {isScanModeActive ? '✓ Scanning' : '📷 Scan Mode'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setIsKioskMode(true)}
          title="Open kiosk mode for associate self-service"
        >
          Kiosk
        </button>
      </div>
    )
  }

  // Compact variant for stats bar
  return (
    <button
      className={`btn btn-scanner btn-small ${isScanModeActive ? 'active' : ''}`}
      onClick={toggleScanMode}
      style={{ marginLeft: '8px' }}
    >
      {isScanModeActive ? '✓ Scan' : '📷 Scan'}
    </button>
  )
}

export default ScannerButton
