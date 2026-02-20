'use client'

import Link from 'next/link'

export default function FinanceConclusionsPage() {
  return (
    <div className="p-8">
      <Link href="/dashboard/finance" className="text-sm text-zinc-400 hover:text-zinc-200">← Финансы</Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Выводы</h1>
      <p className="mt-1 text-zinc-400">Раздел в разработке</p>
    </div>
  )
}
