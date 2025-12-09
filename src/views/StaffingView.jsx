import React from 'react'
import { useStaffing } from '../contexts/StaffingContext'
import { LineColumn } from '../components/staffing/LineColumn'
import { Waitlist } from '../components/staffing/Waitlist'
import { ScannerButton } from '../components/scanner/ScannerButton'

export function StaffingView() {
  const {
    lines,
    setLines,
    waitlist,
    setWaitlist,
    currentDate,
    currentShift,
    saveStatus,
    isLocked,
    setIsLocked,
    isFirebaseConfigured
  } = useStaffing()

  // Handlers
  const handleUpdatePosition = (lineId, positionId, name, isNew) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        return {
          ...line,
          positions: line.positions.map(pos =>
            pos.id === positionId
              ? { ...pos, name, isNew }
              : pos
          )
        }
      }
      return line
    }))
  }

  const handleUpdateWaitlistItem = (itemId, name, isNew) => {
    setWaitlist(prev => prev.map(item =>
      item.id === itemId ? { ...item, name, isNew } : item
    ))
  }

  const handleAddWaitlistItem = () => {
    setWaitlist(prev => [...prev, {
      id: Date.now() + Math.random(),
      name: '',
      isNew: false
    }])
  }

  const handleQuickAddWaitlist = (names) => {
    const newItems = names.map(name => ({
      id: Date.now() + Math.random(),
      name,
      isNew: false
    }))
    setWaitlist(prev => [...prev, ...newItems])
  }

  const handleRemoveWaitlistItem = (itemId) => {
    setWaitlist(prev => prev.filter(item => item.id !== itemId))
  }

  const handleAddLine = () => {
    const newLine = {
      id: Date.now() + Math.random(),
      letter: '',
      leads: [],
      needed: 5,
      isCut: false,
      positions: Array(5).fill(null).map((_, idx) => ({
        id: Date.now() + Math.random() + idx,
        name: '',
        isNew: false
      }))
    }
    setLines(prev => [...prev, newLine])
  }

  const handleToggleCutLine = (lineId) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const newCutStatus = !line.isCut

        if (newCutStatus) {
          // Move associates to waitlist
          const assignedAssociates = line.positions
            .filter(p => p.name.trim())
            .map(p => ({
              id: Date.now() + Math.random(),
              name: p.name,
              isNew: p.isNew
            }))

          if (assignedAssociates.length > 0) {
            setWaitlist(prev => [...prev, ...assignedAssociates])
          }

          return {
            ...line,
            isCut: true,
            positions: line.positions.map(p => ({ ...p, name: '', isNew: false }))
          }
        }

        return { ...line, isCut: newCutStatus }
      }
      return line
    }))
  }

  const handleDragStart = (e, source) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(source))

    // Create drag preview
    const dragPreview = document.createElement('div')
    dragPreview.className = 'drag-preview'

    let dragName = ''
    if (source.type === 'waitlist') {
      const item = waitlist.find(w => w.id === source.id)
      dragName = item?.name || ''
    } else if (source.type === 'position') {
      const line = lines.find(l => l.id === source.lineId)
      const position = line?.positions.find(p => p.id === source.positionId)
      dragName = position?.name || ''
    }

    dragPreview.innerHTML = `
      <div style="min-width: 18px; font-size: 11px; font-weight: 600; color: #6b7280; text-align: center;">⋮⋮</div>
      <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dragName}</div>
    `
    dragPreview.style.left = '-9999px'
    document.body.appendChild(dragPreview)
    e.dataTransfer.setDragImage(dragPreview, 0, 0)
    setTimeout(() => document.body.removeChild(dragPreview), 0)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, target) => {
    e.preventDefault()
    const source = JSON.parse(e.dataTransfer.getData('application/json'))

    // Don't allow drops on cut lines
    if (target.type === 'position') {
      const targetLine = lines.find(l => l.id === target.lineId)
      if (targetLine?.isCut) return
    }

    if (source.type === 'waitlist' && target.type === 'position') {
      const waitlistItem = waitlist.find(w => w.id === source.id)
      const targetLine = lines.find(l => l.id === target.lineId)
      const targetPosition = targetLine?.positions.find(p => p.id === target.positionId)

      if (waitlistItem && targetPosition) {
        if (targetPosition.name.trim()) {
          setWaitlist(prev => [
            ...prev.filter(w => w.id !== source.id),
            {
              id: Date.now() + Math.random(),
              name: targetPosition.name,
              isNew: targetPosition.isNew
            }
          ])
        } else {
          handleRemoveWaitlistItem(source.id)
        }
        handleUpdatePosition(target.lineId, target.positionId, waitlistItem.name, waitlistItem.isNew)
      }
    } else if (source.type === 'position' && target.type === 'waitlist') {
      const sourceLine = lines.find(l => l.id === source.lineId)
      const sourcePosition = sourceLine?.positions.find(p => p.id === source.positionId)
      if (sourcePosition?.name.trim()) {
        setWaitlist(prev => [...prev, {
          id: Date.now() + Math.random(),
          name: sourcePosition.name,
          isNew: sourcePosition.isNew
        }])
        handleUpdatePosition(source.lineId, source.positionId, '', false)
      }
    } else if (source.type === 'position' && target.type === 'position') {
      setLines(prev => prev.map(line => {
        if (line.id === source.lineId || line.id === target.lineId) {
          return {
            ...line,
            positions: line.positions.map(pos => {
              if (line.id === source.lineId && pos.id === source.positionId) {
                const targetLine = prev.find(l => l.id === target.lineId)
                const targetPos = targetLine?.positions.find(p => p.id === target.positionId)
                return targetPos ? { ...pos, name: targetPos.name, isNew: targetPos.isNew } : pos
              } else if (line.id === target.lineId && pos.id === target.positionId) {
                const sourceLine = prev.find(l => l.id === source.lineId)
                const sourcePos = sourceLine?.positions.find(p => p.id === source.positionId)
                return sourcePos ? { ...pos, name: sourcePos.name, isNew: sourcePos.isNew } : pos
              }
              return pos
            })
          }
        }
        return line
      }))
    }
  }

  const handleRemoveLine = (lineId) => {
    if (confirm('Remove this line? This cannot be undone.')) {
      setLines(prev => prev.filter(line => line.id !== lineId))
    }
  }

  const handleUpdateLine = (lineId, updates) => {
    setLines(prev => prev.map(line => {
      if (line.id === lineId) {
        const updatedLine = { ...line, ...updates }

        if (updates.needed !== undefined && updates.needed !== line.positions.length) {
          const newNeeded = parseInt(updates.needed) || 0
          if (newNeeded > line.positions.length) {
            const additionalPositions = Array(newNeeded - line.positions.length)
              .fill(null)
              .map((_, idx) => ({
                id: Date.now() + Math.random() + idx,
                name: '',
                isNew: false
              }))
            updatedLine.positions = [...line.positions, ...additionalPositions]
          } else {
            updatedLine.positions = line.positions.slice(0, newNeeded)
          }
        }

        return updatedLine
      }
      return line
    }))
  }

  const handleToggleLock = () => {
    if (!isLocked) {
      if (confirm('Lock this staffing sheet? Once locked, no edits can be made until it is unlocked.')) {
        setIsLocked(true)
      }
    } else {
      if (confirm('Unlock this staffing sheet? This will allow edits to be made.')) {
        setIsLocked(false)
      }
    }
  }

  if (lines.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Shift Configured</h3>
        <p>Go to "Setup" to create today's staffing chart.</p>
      </div>
    )
  }

  // Calculate stats
  const activeLines = lines.filter(line => !line.isCut)
  const cutLines = lines.filter(line => line.isCut)
  const totalPositions = activeLines.reduce((sum, line) => sum + line.needed, 0)
  const filledPositions = activeLines.reduce((sum, line) =>
    sum + line.positions.filter(p => p.name.trim()).length, 0
  )
  const newAssociates = activeLines.reduce((sum, line) =>
    sum + line.positions.filter(p => p.name.trim() && p.isNew).length, 0
  )

  return (
    <>
      {!isFirebaseConfigured && (
        <div className="firebase-config">
          <h4>⚠️ Firebase Not Configured</h4>
          <p>Data is being saved locally only. To enable cloud sync, configure Firebase.</p>
        </div>
      )}

      <div className="stats-bar">
        <div>
          <strong>{currentDate}</strong> - {currentShift} Shift
          {isLocked && (
            <span className="badge badge-locked" style={{ marginLeft: '12px' }}>
              🔒 LOCKED
            </span>
          )}
        </div>
        <div>
          <strong style={{ color: '#10b981', fontSize: '14px' }}>{filledPositions}</strong> / {totalPositions} filled
          {newAssociates > 0 && <span style={{ marginLeft: '12px', color: '#3b82f6' }}>• {newAssociates} new</span>}
          {cutLines.length > 0 && <span style={{ marginLeft: '12px', color: '#ef4444' }}>• {cutLines.length} cut</span>}
          {waitlist.filter(w => w.name.trim()).length > 0 && (
            <span style={{ marginLeft: '12px', color: '#f59e0b' }}>
              • {waitlist.filter(w => w.name.trim()).length} waiting
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ScannerButton variant="compact" />
          <button
            className={`btn ${isLocked ? 'btn-danger' : 'btn-secondary'}`}
            onClick={handleToggleLock}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            {isLocked ? '🔓 Unlock' : '🔒 Lock'}
          </button>
          {saveStatus && (
            <div className="save-status">{saveStatus}</div>
          )}
        </div>
      </div>

      <div className="staffing-layout">
        <div className="lines-container">
          {lines.map(line => (
            <LineColumn
              key={line.id}
              line={line}
              isLocked={isLocked}
              onUpdatePosition={handleUpdatePosition}
              onUpdateLine={handleUpdateLine}
              onRemoveLine={handleRemoveLine}
              onToggleCutLine={handleToggleCutLine}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))}
          <div
            className="line-column"
            style={{
              minWidth: '120px',
              width: '120px',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              background: '#f9fafb',
              opacity: isLocked ? 0.5 : 1
            }}
            onClick={isLocked ? null : handleAddLine}
          >
            <div style={{ textAlign: 'center', color: '#667eea', fontSize: '14px', fontWeight: '600' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>+</div>
              <div>Add Line</div>
            </div>
          </div>
        </div>

        <Waitlist
          waitlist={waitlist}
          isLocked={isLocked}
          onUpdateWaitlistItem={handleUpdateWaitlistItem}
          onAddWaitlistItem={handleAddWaitlistItem}
          onQuickAddWaitlist={handleQuickAddWaitlist}
          onRemoveWaitlistItem={handleRemoveWaitlistItem}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
      </div>
    </>
  )
}

export default StaffingView
