'use client'

import { useState, useRef, useEffect } from 'react'

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const DAY_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function toYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function formatDisplay(ymd: string): string {
  const [y, m, d] = ymd.split('-')
  if (!d || !m || !y) return ymd
  return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`
}

function getMonthGrid(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  let startDay = first.getDay()
  startDay = startDay === 0 ? 6 : startDay - 1
  const daysInMonth = last.getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = []
  for (let i = 0; i < startDay; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

type ScheduleDatePickerProps = {
  value: string
  onChange: (ymd: string) => void
  className?: string
  allowClear?: boolean
}

export function ScheduleDatePicker({ value, onChange, className = '', allowClear = false }: ScheduleDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => parseYMD(value || toYMD(new Date())))
  const ref = useRef<HTMLDivElement>(null)

  const todayYMD = toYMD(new Date())

  useEffect(() => {
    if (value) setView(parseYMD(value))
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const year = view.getFullYear()
  const month = view.getMonth()
  const grid = getMonthGrid(year, month)

  const handleSelect = (d: number) => {
    const ymd = toYMD(new Date(year, month, d))
    onChange(ymd)
    setOpen(false)
  }

  const handleToday = () => {
    const ymd = todayYMD
    onChange(ymd)
    setView(new Date())
    setOpen(false)
  }

  const handleDelete = () => {
    onChange('')
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-zinc-200 hover:bg-white/10"
      >
        <span className="min-w-[5.5rem] text-left">
          {value ? formatDisplay(value) : '—'}
        </span>
        <svg className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-[100] mt-1 min-w-[16rem] overflow-hidden rounded-xl border border-white/10 bg-[#1a1f2e] shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-white/10 px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {MONTH_NAMES[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView(new Date(year, month - 1, 1))}
                className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Предыдущий месяц"
              >
                Пред
              </button>
              <button
                type="button"
                onClick={() => setView(new Date(year, month + 1, 1))}
                className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white"
                aria-label="Следующий месяц"
              >
                След
              </button>
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-zinc-400">
              {DAY_HEADERS.map((h) => (
                <div key={h} className="py-1 font-medium">
                  {h}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-sm">
              {grid.flat().map((d, idx) => {
                if (d === null) {
                  return <div key={`e-${idx}`} className="py-1.5" />
                }
                const cellYMD = toYMD(new Date(year, month, d))
                const isSelected = value === cellYMD
                const isToday = cellYMD === todayYMD
                return (
                  <button
                    key={cellYMD}
                    type="button"
                    onClick={() => handleSelect(d)}
                    className={`py-1.5 rounded transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : isToday
                          ? 'border border-white/30 text-zinc-200'
                          : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
            {allowClear ? (
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                Удалить
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={handleToday}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
