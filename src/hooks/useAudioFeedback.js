import { useCallback, useRef } from 'react'

/**
 * Hook for playing audio feedback on scan events
 */
export function useAudioFeedback() {
  const audioContextRef = useRef(null)

  // Initialize audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return audioContextRef.current
  }, [])

  // Play a beep sound
  const playBeep = useCallback((frequency = 800, duration = 100, volume = 0.3) => {
    try {
      const ctx = getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration / 1000)
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }, [getAudioContext])

  // Success sound (high beep)
  const playSuccess = useCallback(() => {
    playBeep(1000, 150, 0.3)
    setTimeout(() => playBeep(1200, 100, 0.2), 100)
  }, [playBeep])

  // Error sound (low beep)
  const playError = useCallback(() => {
    playBeep(400, 200, 0.3)
    setTimeout(() => playBeep(300, 150, 0.2), 150)
  }, [playBeep])

  // Warning sound (medium beep)
  const playWarning = useCallback(() => {
    playBeep(600, 150, 0.3)
  }, [playBeep])

  // Duplicate scan sound (quick double beep)
  const playDuplicate = useCallback(() => {
    playBeep(800, 80, 0.25)
    setTimeout(() => playBeep(800, 80, 0.25), 100)
  }, [playBeep])

  return {
    playSuccess,
    playError,
    playWarning,
    playDuplicate,
    playBeep
  }
}

export default useAudioFeedback
