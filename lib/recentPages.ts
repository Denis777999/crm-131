export type RecentPage = { path: string; title: string; timestamp: number }

const STORAGE_KEY = 'crm_recent_pages'
const MAX_PAGES = 5

export function getRecentPages(): RecentPage[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as RecentPage[]
    return Array.isArray(list) ? list.slice(0, MAX_PAGES) : []
  } catch {
    return []
  }
}

export function addRecentPage(path: string, title: string): void {
  if (typeof window === 'undefined') return
  try {
    const list = getRecentPages()
    const filtered = list.filter(p => p.path !== path)
    const entry: RecentPage = { path, title, timestamp: Date.now() }
    const next = [entry, ...filtered].slice(0, MAX_PAGES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}
