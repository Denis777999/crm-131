'use client'

import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="p-8">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200">← Главная</Link>
      <h1 className="mt-2 text-2xl font-semibold text-white">Системные настройки</h1>
      <p className="mt-1 text-zinc-400">Настройки и служебные действия</p>
      <ul className="mt-6 space-y-2">
        <li>
          <Link
            href="/dashboard/settings/import"
            className="text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            Импорт из этого браузера
          </Link>
          <span className="ml-2 text-zinc-500">— перенести данные из localStorage в Supabase</span>
        </li>
      </ul>
    </div>
  )
}
