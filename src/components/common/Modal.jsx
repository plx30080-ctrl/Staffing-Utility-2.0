import React, { useEffect } from 'react'

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'default',
  className = ''
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClass = {
    small: 'max-width: 400px',
    default: 'max-width: 500px',
    large: 'max-width: 700px',
    fullscreen: 'max-width: 95vw; max-height: 95vh'
  }[size]

  return (
    <div className={`quick-add-modal ${className}`} onClick={onClose}>
      <div
        className="quick-add-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '90%', [sizeClass.split(':')[0]]: sizeClass.split(':')[1] }}
      >
        {title && (
          <div className="quick-add-header">
            <h3 className="quick-add-title">{title}</h3>
            <button
              className="btn btn-secondary btn-small"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export default Modal
