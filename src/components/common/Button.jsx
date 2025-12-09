import React from 'react'

export function Button({
  children,
  variant = 'primary',
  size = 'default',
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseClass = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = size === 'small' ? 'btn-small' : size === 'large' ? 'btn-large' : ''

  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
