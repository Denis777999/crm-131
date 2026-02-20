'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  saveOperators,
  setResponsibleOperatorId,
  saveModels,
  savePairs,
  saveShifts,
  saveModelInfo,
  saveModelPhotos,
  saveModelAccesses,
  saveModelComments,
  savePairInfo,
  savePairAccesses,
  savePairComments,
  saveShiftPhotosStart,
  saveShiftPhotosEnd,
  saveShiftEarnings,
  saveShiftBonuses,
  saveOperatorPhotos,
  setSetting,
  FINANCE_COURSE_KEY,
  type OperatorRow,
  type ModelRow,
  type PairRecord,
  type ShiftRow,
  type ModelInfo,
  type SiteAccessItem,
  type CommentItem,
} from '@/lib/crmDb'

const CRM_KEYS = {
  operators: 'crm-operators',
  responsible: 'crm-responsible-operator-id',
  models: 'crm-models',
  pairs: 'crm-pairs',
  shifts: 'crm-shifts',
  financeCourse: 'crm-finance-course',
}

function read<T>(key: string, parse: (raw: string) => T): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return null
    return parse(raw)
  } catch {
    return null
  }
}

export default function ImportFromBrowserPage() {
  const [log, setLog] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const addLog = (msg: string) => setLog((prev) => [...prev, msg])

  const runImport = async () => {
    setLoading(true)
    setLog([])
    setDone(false)
    try {
      const operators = read(CRM_KEYS.operators, (raw) => JSON.parse(raw) as OperatorRow[])
      if (operators && Array.isArray(operators)) {
        await saveOperators(operators.map((o) => ({ ...o, photoUrl: (o as { photoUrl?: string | null }).photoUrl ?? null })))
        addLog(`Операторы: ${operators.length}`)
      }

      const responsibleId = read(CRM_KEYS.responsible, (x) => x)
      if (responsibleId) {
        await setResponsibleOperatorId(responsibleId)
        addLog('Ответственный: установлен')
      }

      const modelsRaw = read(CRM_KEYS.models, (raw) => JSON.parse(raw) as ModelRow[])
      const modelsList = modelsRaw && Array.isArray(modelsRaw) ? modelsRaw : []
      if (modelsList.length > 0) {
        const toSave = modelsList.map((m) => ({
          id: m.id,
          fullName: m.fullName,
          phone: m.phone ?? null,
          status: m.status ?? 'Работает',
          birthDate: m.birthDate ?? null,
          photoUrl: null,
        }))
        await saveModels(toSave)
        addLog(`Модели: ${toSave.length}`)
        for (const m of modelsList) {
          const info = read(`crm-model-info-${m.id}`, (raw) => JSON.parse(raw) as ModelInfo)
          if (info) await saveModelInfo(m.id, info)
          const photos = read(`crm-model-photos-${m.id}`, (raw) => JSON.parse(raw) as string[])
          if (photos && Array.isArray(photos)) await saveModelPhotos(m.id, photos)
          const accesses = read(`crm-model-accesses-${m.id}`, (raw) => JSON.parse(raw) as SiteAccessItem[])
          if (accesses && Array.isArray(accesses)) await saveModelAccesses(m.id, accesses)
          const comments = read(`crm-model-comment-${m.id}`, (raw) => JSON.parse(raw) as CommentItem[])
          if (comments && Array.isArray(comments)) await saveModelComments(m.id, comments)
        }
        addLog('Карточки моделей: сохранены')
      }

      const pairs = read(CRM_KEYS.pairs, (raw) => JSON.parse(raw) as PairRecord[])
      if (pairs && Array.isArray(pairs) && pairs.length > 0) {
        await savePairs(pairs)
        addLog(`Пары: ${pairs.length}`)
        for (const p of pairs) {
          const info = read(`crm-pair-info-${p.id}`, (raw) => JSON.parse(raw) as { status?: string })
          if (info) await savePairInfo(p.id, { status: info.status ?? 'Работает' })
          const accesses = read(`crm-pair-accesses-${p.id}`, (raw) => JSON.parse(raw) as SiteAccessItem[])
          if (accesses && Array.isArray(accesses)) await savePairAccesses(p.id, accesses)
          const comments = read(`crm-pair-comment-${p.id}`, (raw) => JSON.parse(raw) as CommentItem[])
          if (comments && Array.isArray(comments)) await savePairComments(p.id, comments)
        }
        addLog('Карточки пар: сохранены')
      }

      const shifts = read(CRM_KEYS.shifts, (raw) => JSON.parse(raw) as ShiftRow[])
      if (shifts && Array.isArray(shifts) && shifts.length > 0) {
        await saveShifts(shifts)
        addLog(`Смены: ${shifts.length}`)
        for (const s of shifts) {
          const start = read(`crm-shift-photos-start-${s.id}`, (raw) => JSON.parse(raw) as string[])
          if (start && Array.isArray(start)) await saveShiftPhotosStart(s.id, start)
          const legacy = read(`crm-shift-photos-${s.id}`, (raw) => JSON.parse(raw) as string[])
          if (legacy && Array.isArray(legacy) && (start == null || start.length === 0)) await saveShiftPhotosStart(s.id, legacy)
          const end = read(`crm-shift-photos-end-${s.id}`, (raw) => JSON.parse(raw) as string[])
          if (end && Array.isArray(end)) await saveShiftPhotosEnd(s.id, end)
          const earnings = read(`crm-shift-earnings-${s.id}`, (raw) => JSON.parse(raw) as Record<string, string>)
          if (earnings && typeof earnings === 'object') await saveShiftEarnings(s.id, earnings)
          const bonuses = read(`crm-shift-bonuses-${s.id}`, (raw) => JSON.parse(raw) as Record<string, string>)
          if (bonuses && typeof bonuses === 'object') await saveShiftBonuses(s.id, bonuses)
        }
        addLog('Данные смен: сохранены')
      }

      if (operators && Array.isArray(operators)) {
        for (const op of operators) {
          const urls = read(`crm-operator-photos-${op.id}`, (raw) => JSON.parse(raw) as string[])
          if (urls && Array.isArray(urls)) await saveOperatorPhotos(op.id, urls)
        }
        addLog('Фото операторов: сохранены')
      }

      const course = read(CRM_KEYS.financeCourse, (x) => x)
      if (course != null && course !== '') {
        await setSetting(FINANCE_COURSE_KEY, course)
        addLog('Курс (финансы): сохранён')
      }

      addLog('Импорт завершён.')
      setDone(true)
    } catch (e) {
      addLog('Ошибка: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <Link href="/dashboard/settings" className="text-sm text-zinc-400 hover:text-zinc-200">← Настройки</Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Импорт из этого браузера</h1>
      <p className="mt-1 text-zinc-400">
        Перенести данные из localStorage (ключи crm-*) в Supabase. Выполняйте один раз после входа в аккаунт.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <button
          type="button"
          onClick={runImport}
          disabled={loading}
          className="w-fit rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Импорт...' : 'Импортировать'}
        </button>
        {log.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 font-mono text-sm text-zinc-300">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        {done && (
          <p className="text-sm text-emerald-400">Готово. Данные записаны в Supabase и остаются в браузере.</p>
        )}
      </div>
    </div>
  )
}
