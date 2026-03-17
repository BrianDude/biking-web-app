import { useState, useEffect, useRef } from 'react'

// ─── Stage definitions ───────────────────────────────────────────────────────

const STAGES = [
  { name: 'Warm Up',        duration: 600,  bpmLow: 117, bpmHigh: 136, color: '#4ade80', darkColor: '#16a34a', emoji: '🟢' },
  { name: 'Steady Burn',    duration: 900,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
  { name: 'HIIT Intervals', duration: 1200, bpmLow: 146, bpmHigh: 176, color: '#f97316', darkColor: '#c2410c', emoji: '🟠' },
  { name: 'Cooldown Burn',  duration: 600,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
  { name: 'Cool Down',      duration: 300,  bpmLow: 97,  bpmHigh: 117, color: '#818cf8', darkColor: '#4338ca', emoji: '🔵' },
]

const TOTAL_DURATION = STAGES.reduce((sum, s) => sum + s.duration, 0) // 3600s

// Cumulative start time (seconds) for each stage
const STAGE_STARTS = STAGES.reduce<number[]>((acc, _stage, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + STAGES[i - 1].duration)
  return acc
}, [])

// ─── Event triggers (absolute seconds from workout start) ────────────────────

// HIIT sprint cues: absolute minutes 28, 32, 36, 40, 44
// HIIT stage starts at 25 min (1500s); sprints at min 3/7/11/15/19 into stage
const SPRINT_STARTS = [1680, 1920, 2160, 2400, 2640]
const SPRINT_DURATION = 60

// Heart-rate check reminders (absolute seconds)
// Warm Up (every 5 min):       5 min  = 300s
// Steady Burn (every 5 min):   15, 20 min = 900, 1200s
// HIIT (every 3 min):          28, 31, 34, 37, 40, 43 min
// Cooldown Burn (every 5 min): 50 min = 3000s
// Cool Down:                   58 min = 3480s
const HR_CHECK_TIMES = [300, 900, 1200, 1680, 1860, 2040, 2220, 2400, 2580, 3000, 3480]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStageIndex(elapsed: number): number {
  for (let i = STAGE_STARTS.length - 1; i >= 0; i--) {
    if (elapsed >= STAGE_STARTS[i]) return i
  }
  return 0
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function App() {
  const [elapsed, setElapsed]     = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [flashOn, setFlashOn]     = useState(false)
  const [hrAlert, setHrAlert]     = useState(false)
  const [sprintCue, setSprintCue] = useState(false)

  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const hrDismissRef     = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const sprintDismissRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  // ── Derived state ──────────────────────────────────────────────────────────

  const isComplete     = elapsed >= TOTAL_DURATION
  const clampedElapsed = Math.min(elapsed, TOTAL_DURATION - 1)
  const stageIndex     = getStageIndex(clampedElapsed)
  const stage          = STAGES[stageIndex]
  const stageStart     = STAGE_STARTS[stageIndex]
  const timeInStage    = clampedElapsed - stageStart
  const timeRemaining  = isComplete ? 0 : stage.duration - timeInStage
  const progress       = Math.min(elapsed / TOTAL_DURATION, 1)

  const isWarning    = !isComplete && isRunning && timeRemaining <= 10 && timeRemaining > 0
  const inSprint     = SPRINT_STARTS.some(t => elapsed >= t && elapsed < t + SPRINT_DURATION)
  const sprintNumber = SPRINT_STARTS.findIndex(t => elapsed >= t && elapsed < t + SPRINT_DURATION) + 1

  const bgColor = isWarning && flashOn ? stage.darkColor : stage.color

  // ── Main timer tick ────────────────────────────────────────────────────────

  useEffect(() => {
    if (isRunning && !isComplete) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, isComplete])

  // ── Warning flash (1 Hz) ───────────────────────────────────────────────────

  useEffect(() => {
    if (isWarning) {
      flashRef.current = setInterval(() => setFlashOn(f => !f), 500)
    } else {
      if (flashRef.current) clearInterval(flashRef.current)
      setFlashOn(false)
    }
    return () => { if (flashRef.current) clearInterval(flashRef.current) }
  }, [isWarning])

  // ── HR check and sprint cue triggers ──────────────────────────────────────

  useEffect(() => {
    if (!isRunning) return

    if (HR_CHECK_TIMES.includes(elapsed)) {
      setHrAlert(true)
      if (hrDismissRef.current) clearTimeout(hrDismissRef.current)
      hrDismissRef.current = setTimeout(() => setHrAlert(false), 6000)
    }

    if (SPRINT_STARTS.includes(elapsed)) {
      setSprintCue(true)
      if (sprintDismissRef.current) clearTimeout(sprintDismissRef.current)
      sprintDismissRef.current = setTimeout(() => setSprintCue(false), 6000)
    }
  }, [elapsed, isRunning])

  // ── Controls ───────────────────────────────────────────────────────────────

  const handlePlayPause = () => {
    if (isComplete) return
    setIsRunning(r => !r)
  }

  const handleReset = () => {
    setIsRunning(false)
    setElapsed(0)
    setFlashOn(false)
    setHrAlert(false)
    setSprintCue(false)
    if (timerRef.current)         clearInterval(timerRef.current)
    if (flashRef.current)         clearInterval(flashRef.current)
    if (hrDismissRef.current)     clearTimeout(hrDismissRef.current)
    if (sprintDismissRef.current) clearTimeout(sprintDismissRef.current)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        backgroundColor: bgColor,
        transition: 'background-color 1.5s ease',
        minHeight: '100svh',
      }}
      className="flex flex-col items-center justify-between px-4 py-4 gap-2"
    >

      {/* ── TOP: Title + elapsed ── */}
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-black text-white tracking-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          🚴 Fat Burn Ride
        </h1>
        <p className="text-sm text-white/80 mt-0.5 font-mono">
          {formatTime(elapsed)}&thinsp;/&thinsp;60:00 elapsed
        </p>
      </div>

      {/* ── STAGE INFO CARD ── */}
      <div className="w-full max-w-sm">
        <div
          className="rounded-3xl p-5 text-center"
          style={{ background: 'rgba(0,0,0,0.22)', backdropFilter: 'blur(4px)' }}
        >
          <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">
            Stage {stageIndex + 1} of {STAGES.length}
          </p>
          <h2
            className="font-black text-white leading-tight"
            style={{ fontSize: 'clamp(2rem, 9vw, 3rem)', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          >
            {stage.name}
          </h2>
          <p className="text-xl font-bold text-white/90 mt-2">
            🫀 {stage.bpmLow}–{stage.bpmHigh}{' '}
            <span className="text-base font-semibold">BPM</span>
          </p>

          {/* Stage countdown */}
          <p
            className="font-mono font-black text-white mt-3 leading-none"
            style={{
              fontSize: 'clamp(3.5rem, 18vw, 5.5rem)',
              textShadow: '0 3px 16px rgba(0,0,0,0.35)',
            }}
          >
            {isComplete ? '0:00' : formatTime(timeRemaining)}
          </p>
          <p className="text-xs text-white/60 mt-1 uppercase tracking-wider">
            remaining in stage
          </p>

          {/* Active sprint badge */}
          {inSprint && (
            <div
              className="mt-3 inline-block px-4 py-1 rounded-full"
              style={{ background: 'rgba(220,38,38,0.85)' }}
            >
              <span className="text-white font-black text-sm tracking-wide">
                ⚡ SPRINT {sprintNumber}/5 — ALL OUT!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTS ── */}
      <div className="w-full max-w-sm flex flex-col gap-2" style={{ minHeight: '4rem' }}>
        {hrAlert && (
          <div
            className="rounded-2xl p-3 text-center border-2 border-white/60"
            style={{ background: 'rgba(255,255,255,0.28)', backdropFilter: 'blur(4px)' }}
          >
            <p className="text-white font-black text-lg" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
              💓 Check Your Heart Rate!
            </p>
            <p className="text-white/80 text-sm">Target: {stage.bpmLow}–{stage.bpmHigh} BPM</p>
          </div>
        )}
        {sprintCue && (
          <div
            className="rounded-2xl p-4 text-center border-2 border-red-300"
            style={{ background: 'rgba(185,28,28,0.88)' }}
          >
            <p
              className="text-white font-black tracking-wide"
              style={{ fontSize: 'clamp(1.5rem, 7vw, 2rem)', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              ⚡ SPRINT NOW!
            </p>
            <p className="text-white/90 text-sm mt-1">
              1-minute all-out effort · Sprint {sprintNumber}/5
            </p>
          </div>
        )}
        {isComplete && (
          <div
            className="rounded-2xl p-4 text-center border-2 border-white/60"
            style={{ background: 'rgba(255,255,255,0.35)' }}
          >
            <p className="text-white font-black text-2xl">🎉 Workout Complete!</p>
            <p className="text-white/80 text-sm mt-1">60 minutes crushed. Great ride!</p>
          </div>
        )}
      </div>

      {/* ── PLAY / PAUSE (~33vh) ── */}
      <button
        onClick={handlePlayPause}
        disabled={isComplete}
        aria-label={isRunning ? 'Pause' : 'Play'}
        style={{
          height: '33vh',
          minHeight: '110px',
          maxHeight: '220px',
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(4px)',
        }}
        className="w-full max-w-xs rounded-3xl border-4 border-white/50 flex items-center justify-center shadow-2xl active:scale-95 transition-transform duration-150 disabled:opacity-40 cursor-pointer"
      >
        <span
          className="text-white"
          style={{
            fontSize: 'clamp(4rem, 16vw, 7rem)',
            lineHeight: 1,
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {isRunning ? '⏸' : '▶'}
        </span>
      </button>

      {/* ── PROGRESS ── */}
      <div className="w-full max-w-sm">

        {/* Stage segment indicator */}
        <div className="flex gap-1 mb-2">
          {STAGES.map((s, i) => (
            <div
              key={i}
              title={s.name}
              style={{
                flex: s.duration,
                backgroundColor:
                  i < stageIndex  ? 'rgba(255,255,255,0.65)' :
                  i === stageIndex ? 'white' :
                                     'rgba(255,255,255,0.22)',
                height: i === stageIndex ? '10px' : '7px',
                borderRadius: '999px',
                transition: 'all 0.5s ease',
              }}
            />
          ))}
        </div>

        {/* Overall fill bar */}
        <div
          className="rounded-full h-3 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.20)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress * 100}%`,
              background: 'rgba(255,255,255,0.80)',
              transition: 'width 1s linear',
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-white/70 mt-1 font-mono">
          <span>0:00</span>
          <span className="font-bold text-white/90">{Math.round(progress * 100)}%</span>
          <span>60:00</span>
        </div>
      </div>

      {/* ── STAGE LEGEND ── */}
      <div className="w-full max-w-sm">
        <div className="grid grid-cols-5 gap-1 text-center">
          {STAGES.map((s, i) => (
            <div
              key={i}
              className="rounded-xl py-1.5 px-0.5"
              style={{
                background: i === stageIndex ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.12)',
                border: i === stageIndex
                  ? '2px solid rgba(255,255,255,0.6)'
                  : '2px solid transparent',
              }}
            >
              <div className="text-sm leading-none">{s.emoji}</div>
              <div
                className="text-white font-semibold leading-tight mt-0.5"
                style={{ fontSize: '0.6rem' }}
              >
                {s.name.split(' ')[0]}
              </div>
              <div
                className="text-white/60 font-mono leading-tight"
                style={{ fontSize: '0.55rem' }}
              >
                {Math.floor(s.duration / 60)}m
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RESET ── */}
      <button
        onClick={handleReset}
        className="mb-1 px-8 py-3 rounded-full border-2 border-white/30 text-white font-bold text-base active:scale-95 transition-all duration-150 cursor-pointer"
        style={{ background: 'rgba(0,0,0,0.18)' }}
      >
        ↺ Reset
      </button>

    </div>
  )
}
