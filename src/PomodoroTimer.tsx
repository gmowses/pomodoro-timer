import { useState, useEffect, useRef, useCallback } from 'react'
import { Sun, Moon, Languages, Play, Pause, RotateCcw, Settings } from 'lucide-react'

const translations = {
  en: {
    title: 'Pomodoro Timer',
    subtitle: 'Focus 25 min, short break 5 min, long break 15 min after 4 cycles.',
    work: 'Focus',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
    start: 'Start',
    pause: 'Pause',
    reset: 'Reset',
    cycle: 'Cycle',
    nextUp: 'Next',
    settings: 'Settings',
    workMin: 'Focus (min)',
    shortMin: 'Short break (min)',
    longMin: 'Long break (min)',
    cycles: 'Cycles before long break',
    save: 'Save',
    cancel: 'Cancel',
    completed: 'completed',
    builtBy: 'Built by',
  },
  pt: {
    title: 'Temporizador Pomodoro',
    subtitle: 'Foque por 25 min, pausa curta de 5 min, pausa longa de 15 min apos 4 ciclos.',
    work: 'Foco',
    shortBreak: 'Pausa Curta',
    longBreak: 'Pausa Longa',
    start: 'Iniciar',
    pause: 'Pausar',
    reset: 'Reiniciar',
    cycle: 'Ciclo',
    nextUp: 'Proximo',
    settings: 'Configuracoes',
    workMin: 'Foco (min)',
    shortMin: 'Pausa curta (min)',
    longMin: 'Pausa longa (min)',
    cycles: 'Ciclos antes da pausa longa',
    save: 'Salvar',
    cancel: 'Cancelar',
    completed: 'concluidos',
    builtBy: 'Criado por',
  }
} as const

type Lang = keyof typeof translations
type Phase = 'work' | 'short' | 'long'

export default function PomodoroTimer() {
  const [lang, setLang] = useState<Lang>(() => navigator.language.startsWith('pt') ? 'pt' : 'en')
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [phase, setPhase] = useState<Phase>('work')
  const [running, setRunning] = useState(false)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState({ work: 25, short: 5, long: 15, cyclesBeforeLong: 4 })
  const [draft, setDraft] = useState(config)

  const getDuration = useCallback((p: Phase) => {
    if (p === 'work') return config.work * 60
    if (p === 'short') return config.short * 60
    return config.long * 60
  }, [config])

  const [timeLeft, setTimeLeft] = useState(() => config.work * 60)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const t = translations[lang]

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', dark)
  }

  const playBeep = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch { /* audio not available */ }
  }

  const nextPhase = useCallback((current: Phase, cycles: number): { phase: Phase; cycles: number } => {
    if (current === 'work') {
      const newCycles = cycles + 1
      if (newCycles % config.cyclesBeforeLong === 0) {
        return { phase: 'long', cycles: newCycles }
      }
      return { phase: 'short', cycles: newCycles }
    }
    return { phase: 'work', cycles }
  }, [config.cyclesBeforeLong])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!)
            playBeep()
            setRunning(false)
            setPhase(p => {
              const { phase: np, cycles: nc } = nextPhase(p, cyclesCompleted)
              setCyclesCompleted(nc)
              setTimeLeft(getDuration(np))
              return np
            })
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, nextPhase, getDuration, cyclesCompleted])

  const handleReset = () => {
    setRunning(false)
    setTimeLeft(getDuration(phase))
  }

  const handlePhaseChange = (p: Phase) => {
    setRunning(false)
    setPhase(p)
    setTimeLeft(getDuration(p))
  }

  const handleSaveSettings = () => {
    setConfig(draft)
    setRunning(false)
    setPhase('work')
    setTimeLeft(draft.work * 60)
    setCyclesCompleted(0)
    setShowSettings(false)
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const totalTime = getDuration(phase)
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  const PHASE_CONFIG = {
    work: { label: t.work, color: 'red', accent: '#ef4444' },
    short: { label: t.shortBreak, color: 'green', accent: '#22c55e' },
    long: { label: t.longBreak, color: 'blue', accent: '#3b82f6' },
  }
  const current = PHASE_CONFIG[phase]
  const { phase: nextPh } = nextPhase(phase, cyclesCompleted)
  const next = PHASE_CONFIG[nextPh]

  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="font-semibold">Pomodoro Timer</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDraft(config); setShowSettings(s => !s) }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Settings size={14} />{t.settings}
            </button>
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Phase tabs */}
          <div className="flex gap-2">
            {(['work', 'short', 'long'] as Phase[]).map(p => (
              <button key={p} onClick={() => handlePhaseChange(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${phase === p ? 'text-white border-transparent' : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                style={phase === p ? { backgroundColor: PHASE_CONFIG[p].accent, borderColor: PHASE_CONFIG[p].accent } : {}}>
                {PHASE_CONFIG[p].label}
              </button>
            ))}
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <h2 className="font-semibold">{t.settings}</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: t.workMin, key: 'work' as const },
                  { label: t.shortMin, key: 'short' as const },
                  { label: t.longMin, key: 'long' as const },
                  { label: t.cycles, key: 'cyclesBeforeLong' as const },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</label>
                    <input type="number" min={1} max={60} value={draft[key]}
                      onChange={e => setDraft(d => ({ ...d, [key]: Math.max(1, Number(e.target.value)) }))}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveSettings} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors">{t.save}</button>
                <button onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">{t.cancel}</button>
              </div>
            </div>
          )}

          {/* Timer circle */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg width="200" height="200" className="-rotate-90">
                <circle cx="100" cy="100" r={radius} fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth="8" />
                <circle cx="100" cy="100" r={radius} fill="none" stroke={current.accent} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
              </svg>
              <div className="absolute text-center">
                <div className="text-5xl font-bold tabular-nums font-mono" style={{ color: current.accent }}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{current.label}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRunning(r => !r)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold text-sm transition-colors"
                style={{ backgroundColor: current.accent }}>
                {running ? <Pause size={18} /> : <Play size={18} />}
                {running ? t.pause : t.start}
              </button>
              <button onClick={handleReset} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <RotateCcw size={18} />
              </button>
            </div>

            <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              <span>{t.cycle} #{Math.floor(cyclesCompleted / config.cyclesBeforeLong) + 1} &bull; {cyclesCompleted} {t.completed}</span>
              <span className="flex items-center gap-1">{t.nextUp}: <span className="font-medium" style={{ color: next.accent }}>{next.label}</span></span>
            </div>

            {/* Cycle dots */}
            <div className="flex gap-2">
              {Array.from({ length: config.cyclesBeforeLong }).map((_, i) => (
                <div key={i}
                  style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: (cyclesCompleted % config.cyclesBeforeLong) > i ? current.accent : undefined }}
                  className={`transition-colors ${(cyclesCompleted % config.cyclesBeforeLong) > i ? '' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-red-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
