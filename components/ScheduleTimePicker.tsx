'use client'

import { useState, useRef, useEffect } from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function parseTime(val: string): { hour: number; minute: number } {
  if (!val || !val.trim()) return { hour: 0, minute: 0 }
  const part = val.includes(' ') ? val.split(' ')[1] : val
  const [h, m] = (part ?? '').slice(0, 5).split(':').map(Number)
  return { hour: Math.min(23, Math.max(0, h ?? 0)), minute: Math.min(59, Math.max(0, m ?? 0)) }
}

function toTimeString(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

type ScheduleTimePickerProps = {
  value: string
  onChange: (time: string) => void
  disabled?: boolean
  className?: string
}

export function ScheduleTimePicker({ value, onChange, disabled = false, className = '' }: ScheduleTimePickerProps) {
  const [open, setOpen] = useState(false)
  const { hour, minute } = parseTime(value)
  const [viewHour, setViewHour] = useState(hour)
  const [viewMinute, setViewMinute] = useState(minute)
  const ref = useRef<HTMLDivElement>(null)
  const selectedHourRef = useRef<HTMLButtonElement>(null)
  const selectedMinuteRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) {
      selectedHourRef.current?.scrollIntoView({ block: 'nearest' })
      selectedMinuteRef.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [open])

  useEffect(() => {
    const { hour: h, minute: m } = parseTime(value)
    setViewHour(h)
    setViewMinute(m)
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleSelect = (h: number, m: number) => {
    onChange(toTimeString(h, m))
    setOpen(false)
  }

  const displayValue = value && value.trim() ? toTimeString(parseTime(value).hour, parseTime(value).minute) : ''

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
      >
        <span className="min-w-[2.75rem] text-left tabular-nums">
          {displayValue || '—:—'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 flex overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[12rem]">
            <div className="flex flex-col border-r border-white/10">
              <div className="border-b border-white/10 px-2 py-1 text-center text-xs font-medium text-zinc-400">
                Час
              </div>
              <div className="schedule-time-picker-scroll overflow-y-auto overscroll-contain p-1">
                {HOURS.map((h, i) => (
                  <button
                    key={h}
                    ref={viewHour === i ? selectedHourRef : undefined}
                    type="button"
                    onClick={() => {
                      setViewHour(i)
                      handleSelect(i, viewMinute)
                    }}
                    className={`block w-full min-w-[2.5rem] rounded px-2 py-1 text-center text-sm tabular-nums ${
                      viewHour === i
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="border-b border-white/10 px-2 py-1 text-center text-xs font-medium text-zinc-400">
                Мин
              </div>
              <div className="schedule-time-picker-scroll overflow-y-auto overscroll-contain p-1">
                {MINUTES.map((m, i) => (
                  <button
                    key={m}
                    ref={viewMinute === i ? selectedMinuteRef : undefined}
                    type="button"
                    onClick={() => {
                      setViewMinute(i)
                      handleSelect(viewHour, i)
                    }}
                    className={`block w-full min-w-[2.5rem] rounded px-2 py-1 text-center text-sm tabular-nums ${
                      viewMinute === i
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
