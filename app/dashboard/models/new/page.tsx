'use client'

import Link from 'next/link'

export default function NewModelPage() {
  return (
    <div className="p-8">
      <Link href="/dashboard/models" className="text-sm text-zinc-400 hover:text-zinc-200">← К списку моделей</Link>
      <h1 className="mt-4 text-2xl font-semibold text-white">Добавить модель</h1>
      <p className="mt-2 text-zinc-400">Форма добавления модели — в разработке.</p>
    </div>
  )
}
