export interface Contact {
  id: string
  name: string
  address: string
  note?: string
  createdAt: number
  lastUsed?: number
}

const KEY = 'arc_contacts_v1'

export function loadContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Contact[]) : []
  } catch {
    return []
  }
}

export function saveContact(c: Contact): void {
  const list = loadContacts().filter((x) => x.id !== c.id)
  list.unshift(c)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function deleteContact(id: string): void {
  const list = loadContacts().filter((x) => x.id !== id)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function touchContact(id: string): void {
  const list = loadContacts()
  const idx = list.findIndex((x) => x.id === id)
  if (idx !== -1) {
    list[idx] = { ...list[idx], lastUsed: Date.now() }
    localStorage.setItem(KEY, JSON.stringify(list))
  }
}

export function makeContactId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Return initials (up to 2 chars) from a name */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}
