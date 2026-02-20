'use client'

import Link from 'next/link'

export default function ApplicationsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Главная
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Заявки</h1>
        <p className="mt-1 text-zinc-400">Заявки и обращения</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500">
        Раздел в разработке. Здесь будут заявки.
      </div>
    </div>
  )
}
