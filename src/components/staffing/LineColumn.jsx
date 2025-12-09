import React, { useState } from 'react'

export function LineColumn({
  line,
  isLocked,
  onUpdatePosition,
  onUpdateLine,
  onRemoveLine,
  onToggleCutLine,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editLetter, setEditLetter] = useState(line.letter)
  const [editLeads, setEditLeads] = useState((line.leads || []).join(', '))
  const [editNeeded, setEditNeeded] = useState(line.needed)

  const filledCount = line.positions.filter(p => p.name.trim()).length
  const leads = line.leads || (line.lead ? [line.lead] : [])

  const handleSaveEdit = () => {
    const leadsArray = editLeads.split(',').map(l => l.trim()).filter(l => l)
    onUpdateLine(line.id, {
      letter: editLetter,
      leads: leadsArray,
      needed: parseInt(editNeeded) || line.needed
    })
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditLetter(line.letter)
    setEditLeads((line.leads || []).join(', '))
    setEditNeeded(line.needed)
    setIsEditing(false)
  }

  return (
    <div className={`line-column ${line.isCut ? 'cut' : ''}`} style={{ position: 'relative' }}>
      {line.isCut && <div className="cut-badge">CUT</div>}
      <div className="line-header">
        {!isEditing ? (
          <>
            <div className="line-letter">Line {line.letter || '?'}</div>
            <div className="line-lead">
              {leads.length > 0 ? leads.join(', ') : 'No lead'}
            </div>
            <div className="line-stats">{filledCount} / {line.needed} filled</div>
            <div className="line-edit-controls">
              <button
                className="btn btn-secondary btn-small"
                onClick={() => onToggleCutLine(line.id)}
                disabled={isLocked}
                style={{
                  fontSize: '10px',
                  padding: '3px 6px',
                  background: line.isCut ? '#10b981' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  opacity: isLocked ? 0.5 : 1
                }}
              >
                {line.isCut ? 'Restore' : 'Cut'}
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setIsEditing(true)}
                disabled={isLocked}
                style={{ fontSize: '10px', padding: '3px 6px', opacity: isLocked ? 0.5 : 1 }}
              >
                Edit
              </button>
              <button
                className="btn btn-danger btn-small"
                onClick={() => onRemoveLine(line.id)}
                disabled={isLocked}
                style={{ fontSize: '10px', padding: '3px 6px', opacity: isLocked ? 0.5 : 1 }}
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.9 }}>Edit Line</div>
            <input
              type="text"
              className="line-edit-input"
              value={editLetter}
              onChange={(e) => setEditLetter(e.target.value.toUpperCase())}
              placeholder="Letter (A, B, C...)"
              maxLength="2"
            />
            <input
              type="text"
              className="line-edit-input"
              value={editLeads}
              onChange={(e) => setEditLeads(e.target.value)}
              placeholder="Leads (comma-separated)"
            />
            <input
              type="number"
              className="line-edit-input"
              value={editNeeded}
              onChange={(e) => setEditNeeded(e.target.value)}
              placeholder="Quantity"
              min="1"
            />
            <div className="line-edit-controls">
              <button
                className="btn btn-success btn-small"
                onClick={handleSaveEdit}
                style={{ fontSize: '10px', padding: '3px 6px' }}
              >
                Save
              </button>
              <button
                className="btn btn-secondary btn-small"
                onClick={handleCancelEdit}
                style={{ fontSize: '10px', padding: '3px 6px' }}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      <div className="positions-list">
        {line.positions.map((position, index) => (
          <PositionSlot
            key={position.id}
            position={position}
            index={index}
            lineId={line.id}
            isCut={line.isCut}
            isLocked={isLocked}
            onUpdatePosition={onUpdatePosition}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>
    </div>
  )
}

function PositionSlot({
  position,
  index,
  lineId,
  isCut,
  isLocked,
  onUpdatePosition,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const handleDragStart = (e) => {
    if (isLocked) {
      e.preventDefault()
      return
    }
    onDragStart(e, { type: 'position', lineId, positionId: position.id })
  }

  const handleDrop = (e) => {
    if (isLocked) {
      e.preventDefault()
      return
    }
    onDrop(e, { type: 'position', lineId, positionId: position.id })
  }

  return (
    <div
      className={`position-slot ${position.name.trim() ? 'filled' : ''} ${position.isNew ? 'new-associate' : ''}`}
      draggable={!isLocked && position.name.trim() !== '' && !isCut}
      onDragStart={handleDragStart}
      onDragOver={onDragOver}
      onDrop={handleDrop}
      style={{
        cursor: isLocked ? 'not-allowed' : (position.name.trim() && !isCut ? 'grab' : 'default'),
        opacity: isLocked ? 0.7 : 1
      }}
    >
      <div className="position-number">{index + 1}</div>
      <input
        type="text"
        className="position-input"
        value={position.name}
        onChange={(e) => onUpdatePosition(lineId, position.id, e.target.value, position.isNew)}
        placeholder="Name..."
        disabled={isCut || isLocked}
      />
      <div className="position-checkbox">
        <input
          type="checkbox"
          checked={position.isNew}
          onChange={(e) => onUpdatePosition(lineId, position.id, position.name, e.target.checked)}
          disabled={isCut || isLocked}
          title="Mark as new associate"
        />
      </div>
    </div>
  )
}

export default LineColumn
