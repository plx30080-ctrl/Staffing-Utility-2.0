import React from 'react'
import { useStaffing } from '../../contexts/StaffingContext'

export function FirebaseStatus() {
  const { firebaseStatus } = useStaffing()

  const statusText = {
    connected: 'Cloud Connected',
    disconnected: 'Cloud Disconnected',
    offline: 'Offline Mode'
  }[firebaseStatus] || 'Unknown'

  return (
    <div className="firebase-status">
      <div className={`firebase-status-dot ${firebaseStatus}`} />
      <span>{statusText}</span>
    </div>
  )
}

export default FirebaseStatus
