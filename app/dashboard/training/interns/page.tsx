'use client'

import Link from 'next/link'

export default function TrainingInternsPage() {
  return (
    <div className="p-8">
      <Link href="/dashboard/training" className="text-sm text-zinc-400 hover:text-zinc-200">← Обучение</Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Обучение — Интеры</h1>
      <p className="mt-1 text-zinc-400">Раздел в разработке</p>
    </div>
  )
}
