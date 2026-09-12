import { useCallback, useRef, useState } from 'react'

function beep(
  ctx: AudioContext,
  {
    freq,
    duration,
    type = 'sine',
    gain = 0.05,
    slideTo,
  }: {
    freq: number
    duration: number
    type?: OscillatorType
    gain?: number
    slideTo?: number
  },
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration)
  }
  g.gain.setValueAtTime(gain, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export function useSounds(
  mutedExternal?: boolean,
  onMuteChange?: (muted: boolean) => void,
) {
  const ctxRef = useRef<AudioContext | null>(null)
  const [mutedLocal, setMutedLocal] = useState(
    () => localStorage.getItem('flypaper-muted') === '1',
  )
  const muted = mutedExternal ?? mutedLocal

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const toggleMute = useCallback(() => {
    const next = !muted
    localStorage.setItem('flypaper-muted', next ? '1' : '0')
    setMutedLocal(next)
    onMuteChange?.(next)
  }, [muted, onMuteChange])

  const play = useCallback(
    (kind: 'click' | 'scan' | 'credit' | 'error') => {
      if (muted) return
      try {
        const ctx = ensureCtx()
        if (kind === 'click') {
          beep(ctx, { freq: 880, duration: 0.05, type: 'triangle', gain: 0.03 })
        } else if (kind === 'scan') {
          beep(ctx, { freq: 220, duration: 0.45, type: 'sawtooth', gain: 0.04, slideTo: 880 })
          setTimeout(() => beep(ctx, { freq: 660, duration: 0.2, type: 'sine', gain: 0.03 }), 200)
        } else if (kind === 'credit') {
          beep(ctx, { freq: 520, duration: 0.08, type: 'square', gain: 0.03 })
          setTimeout(() => beep(ctx, { freq: 780, duration: 0.1, type: 'square', gain: 0.03 }), 90)
        } else if (kind === 'error') {
          beep(ctx, { freq: 180, duration: 0.25, type: 'square', gain: 0.04, slideTo: 90 })
        }
      } catch {
        /* audio blocked */
      }
    },
    [ensureCtx, muted],
  )

  return { muted, toggleMute, play }
}
