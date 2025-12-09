import React, { useState, useRef, useEffect } from 'react'

export const AVAILABLE_FLAGS = [
  { id: 'sitdown', label: 'Sit-Down', className: 'flag-sitdown' },
  { id: 'sanitation', label: 'Sanitation', className: 'flag-sanitation' },
  { id: 'office', label: 'Office Support', className: 'flag-office' },
  { id: 'high', label: 'High Performer', className: 'flag-high' },
  { id: 'low', label: 'Low Performer', className: 'flag-low' }
]

export function FlagsDropdown({ flags = [], onChange, inForm = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const toggleFlag = (flagId) => {
    const newFlags = flags.includes(flagId)
      ? flags.filter(f => f !== flagId)
      : [...flags, flagId]
    onChange(newFlags)
  }

  const selectedFlagsText = flags.length > 0
    ? flags.map(fid => AVAILABLE_FLAGS.find(f => f.id === fid)?.label).filter(Boolean).join(', ')
    : 'Click to select flags...'

  return (
    <div className="flag-dropdown" ref={dropdownRef}>
      {inForm ? (
        <button
          type="button"
          className="flag-dropdown-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span style={{ color: flags.length === 0 ? '#9ca3af' : '#111827' }}>
            {selectedFlagsText}
          </span>
          <span style={{ fontSize: '10px', color: '#6b7280' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-secondary btn-small"
          onClick={() => setIsOpen(!isOpen)}
          style={{ fontSize: '11px' }}
        >
          Edit Flags ({flags.length})
        </button>
      )}
      {isOpen && (
        <div className="flag-dropdown-content">
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            Select Flags:
          </div>
          {AVAILABLE_FLAGS.map(flag => (
            <div key={flag.id} className="flag-option">
              <input
                type="checkbox"
                checked={flags.includes(flag.id)}
                onChange={() => toggleFlag(flag.id)}
                id={`flag-${flag.id}-${Math.random().toString(36).substr(2, 9)}`}
              />
              <label
                style={{ cursor: 'pointer', flex: 1 }}
                onClick={() => toggleFlag(flag.id)}
              >
                {flag.label}
              </label>
            </div>
          ))}
          {flags.length === 0 && (
            <div style={{
              fontSize: '11px',
              color: '#9ca3af',
              padding: '8px',
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              No flags selected
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FlagBadges({ flags = [] }) {
  if (!flags || flags.length === 0) {
    return (
      <span style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
        No flags
      </span>
    )
  }

  return (
    <div className="core-associate-flags">
      {flags.map(flagId => {
        const flag = AVAILABLE_FLAGS.find(f => f.id === flagId)
        return flag ? (
          <span key={flagId} className={`flag-badge ${flag.className}`}>
            {flag.label}
          </span>
        ) : null
      })}
    </div>
  )
}

export default FlagsDropdown
