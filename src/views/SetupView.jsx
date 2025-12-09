import React, { useState } from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { db, isFirebaseConfigured, loadData, DB_PATHS } from '../config/firebase'

export function SetupView({ onSetupComplete }) {
  const {
    currentDate,
    currentShift,
    setCurrentDate,
    setCurrentShift,
    setLines,
    setWaitlist,
    setIsLocked,
    coreAssociates,
    loadStaffingData,
    storage
  } = useStaffing()

  const [date, setDate] = useState(currentDate)
  const [shift, setShift] = useState(currentShift)
  const [lines, setLocalLines] = useState([{ letter: '', lead: '', needed: '' }])

  const handleAddLine = () => {
    setLocalLines([...lines, { letter: '', lead: '', needed: '' }])
  }

  const handleRemoveLine = (index) => {
    setLocalLines(lines.filter((_, i) => i !== index))
  }

  const handleLineChange = (index, field, value) => {
    const newLines = [...lines]
    newLines[index][field] = value
    setLocalLines(newLines)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Check if staffing sheet already exists
    const docId = `${date}_${shift}`
    let existsInFirebase = false
    let existsInLocalStorage = false

    if (isFirebaseConfigured && db) {
      try {
        const data = await loadData(`${DB_PATHS.STAFFING}/${docId}`)
        existsInFirebase = data !== null
      } catch (error) {
        console.error('Error checking Firebase:', error)
      }
    }

    const localData = storage.load(`staffing_${date}_${shift}`, null)
    existsInLocalStorage = localData !== null

    if (existsInFirebase || existsInLocalStorage) {
      const location = existsInFirebase ? 'cloud' : 'local storage'
      const confirmed = confirm(
        `A staffing sheet already exists for ${date} - ${shift} Shift (saved in ${location}).\n\n` +
        `Would you like to load the existing sheet instead?`
      )

      if (confirmed) {
        setCurrentDate(date)
        setCurrentShift(shift)
        await loadStaffingData(date, shift)
        onSetupComplete?.()
      }
      return
    }

    // Create new staffing sheet
    const validLines = lines.filter(l => l.letter && l.lead && l.needed).map(l => ({
      ...l,
      leads: l.lead.split(',').map(lead => lead.trim()).filter(lead => lead)
    }))

    if (validLines.length === 0) {
      alert('Please fill in all fields for at least one line.')
      return
    }

    const newLines = validLines.map(line => {
      const leads = line.leads || []

      // Combine core associates from all leads
      const allCoreAssociates = []
      leads.forEach(lead => {
        const coreList = coreAssociates[lead] || []
        allCoreAssociates.push(...coreList)
      })

      return {
        id: Date.now() + Math.random(),
        letter: line.letter,
        leads: leads,
        needed: parseInt(line.needed),
        isCut: false,
        positions: Array(parseInt(line.needed)).fill(null).map((_, idx) => {
          if (idx < allCoreAssociates.length) {
            return {
              id: Date.now() + Math.random() + idx,
              name: allCoreAssociates[idx].name,
              isNew: false
            }
          }
          return {
            id: Date.now() + Math.random() + idx,
            name: '',
            isNew: false
          }
        })
      }
    })

    setCurrentDate(date)
    setCurrentShift(shift)
    setLines(newLines)
    setWaitlist([])
    setIsLocked(false)
    onSetupComplete?.()
  }

  const allLeads = Object.keys(coreAssociates)

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      <div className="form-section">
        <h3>Shift Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Shift *</label>
            <select value={shift} onChange={(e) => setShift(e.target.value)} required>
              <option>1st</option>
              <option>2nd</option>
              <option>Swing</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Configure Production Lines</h3>
        {lines.map((line, index) => (
          <div
            key={index}
            className="form-grid"
            style={{
              marginBottom: '12px',
              padding: '12px',
              background: 'white',
              borderRadius: '6px'
            }}
          >
            <div className="form-group">
              <label>Line Letter *</label>
              <input
                type="text"
                value={line.letter}
                onChange={(e) => handleLineChange(index, 'letter', e.target.value.toUpperCase())}
                placeholder="A, B, C..."
                required
                maxLength="2"
              />
            </div>
            <div className="form-group">
              <label>
                Line Lead(s) *{' '}
                <span style={{ fontSize: '10px', fontWeight: 'normal', opacity: '0.7' }}>
                  (comma-separated for multiple)
                </span>
              </label>
              <input
                type="text"
                list="leads"
                value={line.lead}
                onChange={(e) => handleLineChange(index, 'lead', e.target.value)}
                placeholder="John Doe, Jane Smith"
                required
              />
              <datalist id="leads">
                {allLeads.map(lead => (
                  <option key={lead} value={lead} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Associates Needed *</label>
              <input
                type="number"
                value={line.needed}
                onChange={(e) => handleLineChange(index, 'needed', e.target.value)}
                placeholder="Number"
                required
                min="1"
                max="50"
              />
            </div>
            {lines.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => handleRemoveLine(index)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn btn-success"
          onClick={handleAddLine}
          style={{ marginTop: '12px' }}
        >
          + Add Another Line
        </button>
      </div>

      <button
        type="submit"
        className="btn btn-success"
        style={{ fontSize: '14px', padding: '10px 20px' }}
      >
        Start Staffing
      </button>
    </form>
  )
}

export default SetupView
