import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, Square } from 'lucide-react'
import { canRecognise, recogniseOnce, pronunciationScore } from '@/lib/recognition'
import { useSfx } from '@/hooks/useLesson'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const BARS = 40

/**
 * Microphone practice: draws a live waveform from the real input when the
 * browser grants access, and an animated stand-in when it does not.
 * Transcription uses the Web Speech API where available, otherwise a mock.
 */
export default function WaveformRecorder({ expected }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const streamRef = useRef(null)
  const audioRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [result, setResult] = useState(null)
  const sfx = useSfx()

  useEffect(() => () => teardown(), [])

  function teardown() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    audioRef.current?.close?.()
    audioRef.current = null
  }

  function paint(levels) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    const barWidth = width / BARS
    levels.forEach((level, i) => {
      const barHeight = Math.max(3, level * height * 0.92)
      const x = i * barWidth
      const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight)
      gradient.addColorStop(0, '#00B894')
      gradient.addColorStop(1, '#FF6B35')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(x + barWidth * 0.18, (height - barHeight) / 2, barWidth * 0.64, barHeight, 4)
      ctx.fill()
    })
  }

  async function start() {
    setResult(null)
    setRecording(true)
    sfx('click')

    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }

    // Try the real microphone; fall back to a synthetic waveform.
    let analyser = null
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
    } catch {
      analyser = null
    }

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    const draw = (now) => {
      if (analyser && data) {
        analyser.getByteFrequencyData(data)
        const step = Math.floor(data.length / BARS) || 1
        paint(Array.from({ length: BARS }, (_, i) => data[i * step] / 255))
      } else {
        paint(
          Array.from({ length: BARS }, (_, i) =>
            0.18 + Math.abs(Math.sin(now / 240 + i * 0.5)) * (0.35 + Math.random() * 0.4),
          ),
        )
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)

    const { transcript, mocked } = await recogniseOnce({ expected })
    stop({ transcript, mocked })
  }

  function stop(payload) {
    cancelAnimationFrame(rafRef.current)
    teardown()
    setRecording(false)
    paint(Array.from({ length: BARS }, () => 0.04))
    if (payload) {
      const score = pronunciationScore(payload.transcript || '', expected)
      setResult({ ...payload, score })
      sfx(score >= 70 ? 'correct' : 'wrong')
    }
  }

  return (
    <div className="rounded-xl border surface-muted p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Say it out loud</p>
        {!canRecognise && <Badge variant="neutral">Speech-to-text: mock</Badge>}
      </div>

      <p className="mb-3 font-display text-[17px] font-semibold leading-snug">“{expected}”</p>

      <canvas ref={canvasRef} className="mb-3 h-20 w-full rounded-lg surface" aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <Button variant="danger" onClick={() => stop()}>
            <Square className="h-4 w-4" /> Stop
          </Button>
        ) : (
          <Button variant="mint" onClick={start}>
            <Mic className="h-4 w-4" /> Record
          </Button>
        )}

        {recording && (
          <motion.span
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-[13px] font-semibold text-red-500"
          >
            ● Listening…
          </motion.span>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[13px]">
            <span className="font-display text-lg font-bold text-blaze">{result.score}%</span>{' '}
            <span className="text-muted">match · heard: “{result.transcript || '—'}”</span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
