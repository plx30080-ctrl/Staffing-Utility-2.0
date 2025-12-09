import React, { useState, useRef, useEffect } from 'react'

export function Waitlist({
  waitlist,
  isLocked,
  onUpdateWaitlistItem,
  onAddWaitlistItem,
  onQuickAddWaitlist,
  onRemoveWaitlistItem,
  onDragStart,
  onDragOver,
  onDrop
}) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  return (
    <>
      <div
        className="waitlist-sidebar"
        onDragOver={isLocked ? null : onDragOver}
        onDrop={(e) => isLocked ? e.preventDefault() : onDrop(e, { type: 'waitlist' })}
      >
        <div className="waitlist-header">
          <span>WAITLIST ({waitlist.filter(w => w.name.trim()).length})</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-primary btn-small"
              onClick={() => setIsQuickAddOpen(true)}
              disabled={isLocked}
              style={{ fontSize: '11px', opacity: isLocked ? 0.5 : 1 }}
            >
              Quick Add
            </button>
            <button
              className="btn btn-success btn-small"
              onClick={onAddWaitlistItem}
              disabled={isLocked}
              style={{ opacity: isLocked ? 0.5 : 1 }}
            >
              + Add
            </button>
          </div>
        </div>
        <div className="waitlist-items">
          {waitlist.map((item, idx) => (
            <WaitlistItem
              key={item.id}
              item={item}
              index={idx}
              isLocked={isLocked}
              onUpdate={onUpdateWaitlistItem}
              onRemove={onRemoveWaitlistItem}
              onDragStart={onDragStart}
            />
          ))}
          {waitlist.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '12px' }}>
              No one waiting
            </div>
          )}
        </div>
      </div>

      {isQuickAddOpen && (
        <QuickAddModal
          onClose={() => setIsQuickAddOpen(false)}
          onAdd={onQuickAddWaitlist}
        />
      )}
    </>
  )
}

function WaitlistItem({ item, index, isLocked, onUpdate, onRemove, onDragStart }) {
  return (
    <div
      className="waitlist-item"
      draggable={!isLocked && item.name.trim() !== ''}
      onDragStart={(e) => isLocked ? e.preventDefault() : onDragStart(e, { type: 'waitlist', id: item.id })}
      style={{
        cursor: isLocked ? 'not-allowed' : (item.name.trim() ? 'grab' : 'default'),
        opacity: isLocked ? 0.7 : 1
      }}
    >
      <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600' }}>
        #{index + 1}
        {item.employeeNumber && (
          <span style={{ marginLeft: '4px', color: '#9ca3af' }}>
            ({item.employeeNumber})
          </span>
        )}
      </div>
      <input
        type="text"
        className="waitlist-input"
        value={item.name}
        onChange={(e) => onUpdate(item.id, e.target.value, item.isNew)}
        placeholder="Type name..."
        disabled={isLocked}
      />
      <div className="waitlist-controls">
        <input
          type="checkbox"
          checked={item.isNew}
          onChange={(e) => onUpdate(item.id, item.name, e.target.checked)}
          style={{ width: '14px', height: '14px' }}
          disabled={isLocked}
        />
        <label style={{ fontSize: '11px', flex: 1 }}>New</label>
        <button
          className="btn btn-danger btn-small"
          onClick={() => onRemove(item.id)}
          disabled={isLocked}
          style={{ opacity: isLocked ? 0.5 : 1 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}

function QuickAddModal({ onClose, onAdd }) {
  const [quickAddInput, setQuickAddInput] = useState('')
  const [quickAddNames, setQuickAddNames] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && quickAddInput.trim()) {
      setQuickAddNames([...quickAddNames, quickAddInput.trim()])
      setQuickAddInput('')
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleRemoveName = (index) => {
    setQuickAddNames(quickAddNames.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    if (quickAddNames.length > 0) {
      onAdd(quickAddNames)
    }
    onClose()
  }

  return (
    <div className="quick-add-modal" onClick={onClose}>
      <div className="quick-add-content" onClick={(e) => e.stopPropagation()}>
        <div className="quick-add-header">
          <h3 className="quick-add-title">Quick Add to Waitlist</h3>
          <button className="btn btn-secondary btn-small" onClick={onClose}>
            ×
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          className="quick-add-input"
          value={quickAddInput}
          onChange={(e) => setQuickAddInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a name and press Enter..."
        />

        <div className="quick-add-hint">
          Press Enter to add • Press Escape to close
        </div>

        {quickAddNames.length > 0 && (
          <div className="quick-add-list">
            {quickAddNames.map((name, index) => (
              <div key={index} className="quick-add-item">
                <span style={{ fontWeight: '500' }}>
                  {index + 1}. {name}
                </span>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleRemoveName(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {quickAddNames.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            color: '#9ca3af',
            fontSize: '13px',
            fontStyle: 'italic'
          }}>
            No names added yet
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-success"
            onClick={handleConfirm}
            disabled={quickAddNames.length === 0}
          >
            Add {quickAddNames.length} to Waitlist
          </button>
        </div>
      </div>
    </div>
  )
}

export default Waitlist
