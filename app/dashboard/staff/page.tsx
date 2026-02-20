'use client'

import Link from 'next/link'

export default function StaffPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Главная
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Сотрудники</h1>
        <p className="mt-1 text-zinc-400">Команда и операторы</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-zinc-500">
        Раздел в разработке. Здесь будут сотрудники.
      </div>
    </div>
  )
}
