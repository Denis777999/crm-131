'use client'

import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { loadShifts, loadShiftEarnings } from '@/lib/crmDb'

const SITES = ['Chaturbate', 'Stripchat', 'Livejasmin', 'My.club', 'Camsoda'] as const

export default function FinanceConclusionsPage() {
  const [shifts, setShifts] = useState<{ id: string }[]>([])
  const [earningsByShift, setEarningsByShift] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadShifts()
      .then((list) => {
        if (cancelled) return null
        setShifts(list.map((s) => ({ id: s.id })))
        return Promise.all(list.map((s) => loadShiftEarnings(s.id))).then((perShift) => ({ list, perShift }))
      })
      .then((data) => {
        if (cancelled || !data || !('list' in data)) return
        const map: Record<string, Record<string, string>> = {}
        data.list.forEach((s, i) => {
          map[s.id] = data.perShift[i] ?? {}
        })
        setEarningsByShift(map)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const { bySite, total } = useMemo(() => {
    const bySite: Record<string, number> = {}
    let total = 0
    for (const shiftId of Object.keys(earningsByShift)) {
      const rec = earningsByShift[shiftId]
      for (const [site, value] of Object.entries(rec)) {
        const num = parseFloat(String(value).replace(/,/g, '.')) || 0
        if (num) {
          bySite[site] = (bySite[site] ?? 0) + num
          total += num
        }
      }
    }
    return { bySite, total }
  }, [earningsByShift])

  const siteList = useMemo(() => {
    const fromSites = new Set<string>(SITES)
    const fromData = Object.keys(bySite).filter((s) => !fromSites.has(s))
    return [...SITES, ...fromData.sort()]
  }, [bySite])

  return (
    <div className="p-8">
      <Link href="/dashboard/finance" className="text-sm text-zinc-400 hover:text-zinc-200">
        ← Финансы
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Выводы</h1>
      <p className="mt-1 text-zinc-400">Заработок по сайтам (все смены)</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full min-w-[320px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400">
              <th className="px-4 py-3 font-medium">Сайт</th>
              <th className="px-4 py-3 font-medium text-right">Заработок $</th>
              <th className="px-4 py-3 font-medium text-right">Итог</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Загрузка…
                </td>
              </tr>
            ) : siteList.length === 0 && total === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">
                  Нет данных по заработкам
                </td>
              </tr>
            ) : (
              <>
                {siteList.map((site) => {
                  const sum = bySite[site] ?? 0
                  if (sum === 0 && SITES.includes(site as (typeof SITES)[number])) {
                    return (
                      <tr key={site} className="border-b border-white/5 text-zinc-200">
                        <td className="px-4 py-3 font-medium text-white">{site}</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">—</td>
                      </tr>
                    )
                  }
                  if (sum === 0) return null
                  return (
                    <tr key={site} className="border-b border-white/5 text-zinc-200">
                      <td className="px-4 py-3 font-medium text-white">{site}</td>
                      <td className="px-4 py-3 text-right">
                        {sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                      <td className="px-4 py-3 text-right">
                        {sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                    </tr>
                  )
                })}
                <tr className="border-t border-white/10 bg-white/5 font-medium text-zinc-300">
                  <td className="px-4 py-3 text-white">Итог</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-white">
                    {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
