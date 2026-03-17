import { useState, useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = {
  name: string
  duration: number
  bpmLow: number
  bpmHigh: number
  color: string
  darkColor: string
  emoji: string
}

type Plan = {
  id: string
  label: string
  subtitle: string
  totalMinutes: number
  cardEmoji: string
  stages: Stage[]
  sprintStarts: number[]    // absolute seconds from workout start
  sprintDuration: number
  sprintTotal: number
  hrCheckTimes: number[]    // absolute seconds from workout start
}

// ─── Plan definitions ─────────────────────────────────────────────────────────

// 30 Min — Weekday Fast
// Stages: Warm Up 5 min | HIIT 20 min | Cool Down 5 min
// HIIT starts at 300s. Sprint pattern: 3 min steady → 1 min sprint × 5 (every 4 min)
//   Sprint starts (absolute): 480, 720, 960, 1200, 1440
//   Verification: 5 cycles × 4 min = 20 min ✓ — last sprint ends at 1500s = end of HIIT ✓
const PLAN_30: Plan = {
  id: '30',
  label: '30 Min',
  subtitle: 'Weekday Fast',
  totalMinutes: 30,
  cardEmoji: '⚡',
  stages: [
    { name: 'Warm Up',        duration: 300,  bpmLow: 117, bpmHigh: 136, color: '#4ade80', darkColor: '#16a34a', emoji: '🟢' },
    { name: 'HIIT Intervals', duration: 1200, bpmLow: 146, bpmHigh: 176, color: '#f97316', darkColor: '#c2410c', emoji: '🟠' },
    { name: 'Cool Down',      duration: 300,  bpmLow: 97,  bpmHigh: 117, color: '#818cf8', darkColor: '#4338ca', emoji: '🔵' },
  ],
  sprintStarts: [480, 720, 960, 1200, 1440],
  sprintDuration: 60,
  sprintTotal: 5,
  // Warm Up 3 min mark | HIIT every 3 min | Cool Down 3 min mark
  hrCheckTimes: [180, 480, 660, 840, 1020, 1200, 1380, 1680],
}

// 40 Min — Weekday Steady
// Stages: Warm Up 5 min | Steady 10 min | HIIT 16 min | Steady Cooldown 4 min | Cool Down 5 min
// HIIT starts at 900s. Sprint pattern: 3 min steady → 1 min sprint × 4 (every 4 min)
//   Sprint starts (absolute): 1080, 1320, 1560, 1800
//   Verification: 4 cycles × 4 min = 16 min ✓ — last sprint ends at 1860s = end of HIIT ✓
const PLAN_40: Plan = {
  id: '40',
  label: '40 Min',
  subtitle: 'Weekday Steady',
  totalMinutes: 40,
  cardEmoji: '🔥',
  stages: [
    { name: 'Warm Up',         duration: 300,  bpmLow: 117, bpmHigh: 136, color: '#4ade80', darkColor: '#16a34a', emoji: '🟢' },
    { name: 'Steady Burn',     duration: 600,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
    { name: 'HIIT Intervals',  duration: 960,  bpmLow: 146, bpmHigh: 176, color: '#f97316', darkColor: '#c2410c', emoji: '🟠' },
    { name: 'Steady Cooldown', duration: 240,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
    { name: 'Cool Down',       duration: 300,  bpmLow: 97,  bpmHigh: 117, color: '#818cf8', darkColor: '#4338ca', emoji: '🔵' },
  ],
  sprintStarts: [1080, 1320, 1560, 1800],
  sprintDuration: 60,
  sprintTotal: 4,
  // Warm Up 3 min | Steady 5 min in | HIIT every 3 min | Steady Cooldown 2 min in | Cool Down 3 min in
  hrCheckTimes: [180, 600, 1080, 1260, 1440, 1620, 1800, 1980, 2280],
}

// 60 Min — Weekend Full Burn (original plan — unchanged)
// HIIT starts at 1500s. Sprint pattern: minutes 28, 32, 36, 40, 44
const PLAN_60: Plan = {
  id: '60',
  label: '60 Min',
  subtitle: 'Weekend Full Burn',
  totalMinutes: 60,
  cardEmoji: '💪',
  stages: [
    { name: 'Warm Up',        duration: 600,  bpmLow: 117, bpmHigh: 136, color: '#4ade80', darkColor: '#16a34a', emoji: '🟢' },
    { name: 'Steady Burn',    duration: 900,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
    { name: 'HIIT Intervals', duration: 1200, bpmLow: 146, bpmHigh: 176, color: '#f97316', darkColor: '#c2410c', emoji: '🟠' },
    { name: 'Cooldown Burn',  duration: 600,  bpmLow: 136, bpmHigh: 156, color: '#facc15', darkColor: '#ca8a04', emoji: '🟡' },
    { name: 'Cool Down',      duration: 300,  bpmLow: 97,  bpmHigh: 117, color: '#818cf8', darkColor: '#4338ca', emoji: '🔵' },
  ],
  sprintStarts: [1680, 1920, 2160, 2400, 2640],
  sprintDuration: 60,
  sprintTotal: 5,
  hrCheckTimes: [300, 900, 1200, 1680, 1860, 2040, 2220, 2400, 2580, 3000, 3480],
}

const ALL_PLANS: Plan[] = [PLAN_30, PLAN_40, PLAN_60]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStageStarts(stages: Stage[]): number[] {
  return stages.reduce<number[]>((acc, _s, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + stages[i - 1].duration)
    return acc
  }, [])
}

function getStageIndex(elapsed: number, stageStarts: number[]): number {
  for (let i = stageStarts.length - 1; i >= 0; i--) {
    if (elapsed >= stageStarts[i]) return i
  }
  return 0
}

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// ─── PlanSelector ─────────────────────────────────────────────────────────────

function PlanSelector({ onSelect }: { onSelect: (plan: Plan) => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 py-8 gap-4"
      style={{
        minHeight: '100svh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-2">
        <div className="text-5xl mb-3">🚴</div>
        <h1
          className="font-black text-white tracking-tight leading-none"
          style={{ fontSize: 'clamp(2rem, 10vw, 3rem)', textShadow: '0 2px 16px rgba(99,102,241,0.5)' }}
        >
          Fat Burn Ride
        </h1>
        <p className="text-white/50 mt-2 text-base font-medium">Choose your workout</p>
      </div>

      {/* Plan cards */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {ALL_PLANS.map(plan => {
          const totalDuration = plan.stages.reduce((s, st) => s + st.duration, 0)
          return (
            <button
              key={plan.id}
              onClick={() => onSelect(plan)}
              className="w-full rounded-3xl p-5 text-left border-2 active:scale-95 transition-transform duration-150 cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.14)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p
                    className="font-black text-white leading-none"
                    style={{ fontSize: 'clamp(1.4rem, 6vw, 1.8rem)' }}
                  >
                    {plan.label}
                  </p>
                  <p className="text-white/60 text-sm font-semibold mt-0.5">{plan.subtitle}</p>
                </div>
                <span
                  className="text-4xl"
                  style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
                >
                  {plan.cardEmoji}
                </span>
              </div>

              {/* Stage color bar */}
              <div className="flex gap-1 rounded-full overflow-hidden" style={{ height: '8px' }}>
                {plan.stages.map((s, i) => (
                  <div
                    key={i}
                    title={s.name}
                    style={{ flex: s.duration, backgroundColor: s.color }}
                  />
                ))}
              </div>

              {/* Stage labels */}
              <div className="flex gap-1 mt-1.5">
                {plan.stages.map((s, i) => (
                  <p
                    key={i}
                    className="text-white/40 text-center font-mono leading-tight"
                    style={{ flex: s.duration, fontSize: '0.58rem' }}
                  >
                    {Math.floor(s.duration / 60)}m
                  </p>
                ))}
              </div>

              {/* Plan stats */}
              <div className="flex gap-3 mt-3">
                <span
                  className="px-2 py-0.5 rounded-full text-white/70 font-semibold"
                  style={{ background: 'rgba(255,255,255,0.10)', fontSize: '0.7rem' }}
                >
                  {formatTime(totalDuration)}
                </span>
                {plan.sprintTotal > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(249,115,22,0.25)', color: '#fdba74', fontSize: '0.7rem' }}
                  >
                    ⚡ {plan.sprintTotal} sprints
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── WorkoutScreen ────────────────────────────────────────────────────────────

function WorkoutScreen({ plan, onReset }: { plan: Plan; onReset: () => void }) {
  const [elapsed, setElapsed]     = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [flashOn, setFlashOn]     = useState(false)
  const [hrAlert, setHrAlert]     = useState(false)
  const [sprintCue, setSprintCue] = useState(false)

  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const hrDismissRef     = useRef<ReturnType<typeof setTimeout>  | null>(null)
  const sprintDismissRef = useRef<ReturnType<typeof setTimeout>  | null>(null)

  // Unpack active plan data into local constants so the logic below is unchanged
  const STAGES         = plan.stages
  const TOTAL_DURATION = STAGES.reduce((sum, s) => sum + s.duration, 0)
  const STAGE_STARTS   = computeStageStarts(STAGES)
  const SPRINT_STARTS  = plan.sprintStarts
  const SPRINT_DURATION = plan.sprintDuration
  const HR_CHECK_TIMES = plan.hrCheckTimes

  // ── Derived state ────────────────────────────────────────────────────────

  const isComplete     = elapsed >= TOTAL_DURATION
  const clampedElapsed = Math.min(elapsed, TOTAL_DURATION - 1)
  const stageIndex     = getStageIndex(clampedElapsed, STAGE_STARTS)
  const stage          = STAGES[stageIndex]
  const stageStart     = STAGE_STARTS[stageIndex]
  const timeInStage    = clampedElapsed - stageStart
  const timeRemaining  = isComplete ? 0 : stage.duration - timeInStage
  const progress       = Math.min(elapsed / TOTAL_DURATION, 1)

  const isWarning    = !isComplete && isRunning && timeRemaining <= 10 && timeRemaining > 0
  const inSprint     = SPRINT_STARTS.some(t => elapsed >= t && elapsed < t + SPRINT_DURATION)
  const sprintNumber = SPRINT_STARTS.findIndex(t => elapsed >= t && elapsed < t + SPRINT_DURATION) + 1

  const bgColor = isWarning && flashOn ? stage.darkColor : stage.color

  // ── Main timer tick ──────────────────────────────────────────────────────

  useEffect(() => {
    if (isRunning && !isComplete) {
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, isComplete])

  // ── Warning flash (1 Hz) ─────────────────────────────────────────────────

  useEffect(() => {
    if (isWarning) {
      flashRef.current = setInterval(() => setFlashOn(f => !f), 500)
    } else {
      if (flashRef.current) clearInterval(flashRef.current)
      setFlashOn(false)
    }
    return () => { if (flashRef.current) clearInterval(flashRef.current) }
  }, [isWarning])

  // ── HR check and sprint cue triggers ────────────────────────────────────

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
  }, [elapsed, isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ─────────────────────────────────────────────────────────────

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
    onReset()
  }

  // ── Render ───────────────────────────────────────────────────────────────

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
        <h1
          className="text-2xl font-black text-white tracking-tight"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          🚴 {plan.subtitle}
        </h1>
        <p className="text-sm text-white/80 mt-0.5 font-mono">
          {formatTime(elapsed)}&thinsp;/&thinsp;{plan.totalMinutes}:00 elapsed
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
                ⚡ SPRINT {sprintNumber}/{plan.sprintTotal} — ALL OUT!
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
            <p
              className="text-white font-black text-lg"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}
            >
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
              1-minute all-out effort · Sprint {sprintNumber}/{plan.sprintTotal}
            </p>
          </div>
        )}
        {isComplete && (
          <div
            className="rounded-2xl p-4 text-center border-2 border-white/60"
            style={{ background: 'rgba(255,255,255,0.35)' }}
          >
            <p className="text-white font-black text-2xl">🎉 Workout Complete!</p>
            <p className="text-white/80 text-sm mt-1">
              {plan.totalMinutes} minutes crushed. Great ride!
            </p>
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
                  i < stageIndex   ? 'rgba(255,255,255,0.65)' :
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
          <span>{plan.totalMinutes}:00</span>
        </div>
      </div>

      {/* ── STAGE LEGEND ── */}
      <div className="w-full max-w-sm">
        <div
          className="grid gap-1 text-center"
          style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}
        >
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

      {/* ── RESET (returns to plan selector) ── */}
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  if (!selectedPlan) {
    return <PlanSelector onSelect={setSelectedPlan} />
  }

  return <WorkoutScreen plan={selectedPlan} onReset={() => setSelectedPlan(null)} />
}
