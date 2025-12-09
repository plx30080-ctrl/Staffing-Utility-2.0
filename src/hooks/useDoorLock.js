import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Custom hook for door lock hardware integration
 *
 * This hook provides an abstraction layer for door lock control.
 * It can be configured to work with different hardware backends:
 *
 * 1. Web Serial API - Direct communication with Arduino/microcontroller
 * 2. HTTP/WebSocket - Communication with a local server (e.g., Raspberry Pi)
 * 3. Custom Event - Emit events for external systems to handle
 */

// Lock states
export const LOCK_STATES = {
  UNKNOWN: 'unknown',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
  ERROR: 'error'
}

// Connection modes
export const CONNECTION_MODES = {
  NONE: 'none',
  SERIAL: 'serial',
  HTTP: 'http',
  WEBSOCKET: 'websocket',
  EVENT: 'event'
}

export function useDoorLock(options = {}) {
  const {
    mode = CONNECTION_MODES.EVENT,
    httpUrl = 'http://localhost:8080/door',
    wsUrl = 'ws://localhost:8080/door',
    unlockDuration = 5000, // Default 5 seconds
    autoRelock = true
  } = options

  const [lockState, setLockState] = useState(LOCK_STATES.UNKNOWN)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUnlock, setLastUnlock] = useState(null)
  const [error, setError] = useState(null)

  const serialPortRef = useRef(null)
  const webSocketRef = useRef(null)
  const relockTimeoutRef = useRef(null)

  // Connect to hardware (for Serial and WebSocket modes)
  const connect = useCallback(async () => {
    setError(null)

    switch (mode) {
      case CONNECTION_MODES.SERIAL:
        return connectSerial()
      case CONNECTION_MODES.WEBSOCKET:
        return connectWebSocket()
      case CONNECTION_MODES.HTTP:
        // HTTP doesn't need persistent connection
        setIsConnected(true)
        return true
      case CONNECTION_MODES.EVENT:
        // Event mode is always "connected"
        setIsConnected(true)
        return true
      default:
        return false
    }
  }, [mode])

  // Connect via Web Serial API
  const connectSerial = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('Web Serial API not supported')
      return false
    }

    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      serialPortRef.current = port
      setIsConnected(true)
      console.log('Serial port connected')
      return true
    } catch (err) {
      setError(err.message)
      setIsConnected(false)
      return false
    }
  }, [])

  // Connect via WebSocket
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setIsConnected(true)
        console.log('WebSocket connected')
      }

      ws.onclose = () => {
        setIsConnected(false)
        console.log('WebSocket disconnected')
      }

      ws.onerror = (err) => {
        setError('WebSocket error')
        setIsConnected(false)
      }

      ws.onmessage = (event) => {
        handleHardwareMessage(event.data)
      }

      webSocketRef.current = ws
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [wsUrl])

  // Disconnect from hardware
  const disconnect = useCallback(async () => {
    if (serialPortRef.current) {
      await serialPortRef.current.close()
      serialPortRef.current = null
    }

    if (webSocketRef.current) {
      webSocketRef.current.close()
      webSocketRef.current = null
    }

    setIsConnected(false)
  }, [])

  // Handle messages from hardware
  const handleHardwareMessage = useCallback((message) => {
    try {
      const data = JSON.parse(message)
      if (data.state) {
        setLockState(data.state)
      }
    } catch {
      // Handle raw string messages
      if (message.includes('LOCKED')) {
        setLockState(LOCK_STATES.LOCKED)
      } else if (message.includes('UNLOCKED')) {
        setLockState(LOCK_STATES.UNLOCKED)
      }
    }
  }, [])

  // Send unlock command
  const unlock = useCallback(async (duration = unlockDuration) => {
    // Clear any pending relock
    if (relockTimeoutRef.current) {
      clearTimeout(relockTimeoutRef.current)
    }

    const timestamp = new Date().toISOString()
    setLastUnlock(timestamp)

    try {
      switch (mode) {
        case CONNECTION_MODES.SERIAL:
          await sendSerialCommand('UNLOCK')
          break

        case CONNECTION_MODES.WEBSOCKET:
          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            webSocketRef.current.send(JSON.stringify({
              command: 'unlock',
              duration
            }))
          }
          break

        case CONNECTION_MODES.HTTP:
          await fetch(httpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'unlock', duration })
          })
          break

        case CONNECTION_MODES.EVENT:
          // Dispatch custom event for external handlers
          window.dispatchEvent(new CustomEvent('crescentDoorUnlock', {
            detail: {
              timestamp,
              duration,
              command: 'unlock'
            }
          }))
          console.log('DOOR_UNLOCK_SIGNAL:', { timestamp, duration })
          break
      }

      setLockState(LOCK_STATES.UNLOCKED)

      // Schedule auto-relock
      if (autoRelock) {
        relockTimeoutRef.current = setTimeout(() => {
          lock()
        }, duration)
      }

      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [mode, unlockDuration, httpUrl, autoRelock])

  // Send lock command
  const lock = useCallback(async () => {
    if (relockTimeoutRef.current) {
      clearTimeout(relockTimeoutRef.current)
    }

    try {
      switch (mode) {
        case CONNECTION_MODES.SERIAL:
          await sendSerialCommand('LOCK')
          break

        case CONNECTION_MODES.WEBSOCKET:
          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            webSocketRef.current.send(JSON.stringify({ command: 'lock' }))
          }
          break

        case CONNECTION_MODES.HTTP:
          await fetch(httpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: 'lock' })
          })
          break

        case CONNECTION_MODES.EVENT:
          window.dispatchEvent(new CustomEvent('crescentDoorLock', {
            detail: {
              timestamp: new Date().toISOString(),
              command: 'lock'
            }
          }))
          break
      }

      setLockState(LOCK_STATES.LOCKED)
      return true
    } catch (err) {
      setError(err.message)
      return false
    }
  }, [mode, httpUrl])

  // Send command via Serial
  const sendSerialCommand = useCallback(async (command) => {
    if (!serialPortRef.current) {
      throw new Error('Serial port not connected')
    }

    const encoder = new TextEncoder()
    const writer = serialPortRef.current.writable.getWriter()

    try {
      await writer.write(encoder.encode(command + '\n'))
    } finally {
      writer.releaseLock()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (relockTimeoutRef.current) {
        clearTimeout(relockTimeoutRef.current)
      }
      disconnect()
    }
  }, [disconnect])

  // Listen for external unlock events (for manual triggers)
  useEffect(() => {
    const handleExternalUnlock = (event) => {
      const { duration } = event.detail || {}
      unlock(duration || unlockDuration)
    }

    window.addEventListener('triggerDoorUnlock', handleExternalUnlock)
    return () => {
      window.removeEventListener('triggerDoorUnlock', handleExternalUnlock)
    }
  }, [unlock, unlockDuration])

  return {
    // State
    lockState,
    isConnected,
    lastUnlock,
    error,

    // Actions
    connect,
    disconnect,
    unlock,
    lock,

    // Utilities
    isLocked: lockState === LOCK_STATES.LOCKED,
    isUnlocked: lockState === LOCK_STATES.UNLOCKED
  }
}

/**
 * Arduino sketch example for door lock:
 *
 * const int RELAY_PIN = 7;
 *
 * void setup() {
 *   Serial.begin(9600);
 *   pinMode(RELAY_PIN, OUTPUT);
 *   digitalWrite(RELAY_PIN, LOW); // Start locked
 * }
 *
 * void loop() {
 *   if (Serial.available() > 0) {
 *     String command = Serial.readStringUntil('\n');
 *     command.trim();
 *
 *     if (command == "UNLOCK") {
 *       digitalWrite(RELAY_PIN, HIGH);
 *       Serial.println("UNLOCKED");
 *     } else if (command == "LOCK") {
 *       digitalWrite(RELAY_PIN, LOW);
 *       Serial.println("LOCKED");
 *     }
 *   }
 * }
 */

export default useDoorLock
