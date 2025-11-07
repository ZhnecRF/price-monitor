import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

type Group = { id: number; name: string; created_at: string }
type Item = {
  id: number
  group_id: number
  url: string
  marketplace?: string
  title?: string
  custom_name?: string
  pack_qty?: number
  current_price?: number
  price_per_unit?: number
  updated_at?: string
}
type AuthSession = { marketplace: string; cookies_json: string; updated_at: string }

type DB = {
  seq: number
  groups: Group[]
  items: Item[]
  auth_sessions: AuthSession[]
}

let DB_PATH = ''
let state: DB

export function initDb() {
  const dir = app.getPath('userData')
  DB_PATH = join(dir, 'price-monitor.json')
  if (!existsSync(DB_PATH)) {
    state = { seq: 1, groups: [], items: [], auth_sessions: [] }
    persist()
  } else {
    try {
      const raw = readFileSync(DB_PATH, 'utf8')
      state = JSON.parse(raw) as DB
      if (typeof state.seq !== 'number') state.seq = 1
      state.groups ||= []
      state.items ||= []
      state.auth_sessions ||= []
    } catch {
      state = { seq: 1, groups: [], items: [], auth_sessions: [] }
      persist()
    }
  }
}

function persist() {
  const dir = dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8')
}

// ====== GROUPS ======
export function listGroups(): Group[] {
  return [...state.groups].sort((a, b) => b.id - a.id)
}
export function createGroup(name: string): Group {
  const g: Group = { id: state.seq++, name, created_at: new Date().toISOString() }
  state.groups.push(g)
  persist()
  return g
}

// ====== ITEMS (заглушки, пригодятся дальше) ======
export function listItemsByGroup(groupId: number): Item[] {
  return state.items.filter(i => i.group_id === groupId)
}
export function upsertItem(it: Partial<Item> & { id?: number; group_id: number }) {
  if (!it.id) {
    it.id = state.seq++
    state.items.push(it as Item)
  } else {
    const idx = state.items.findIndex(x => x.id === it.id)
    if (idx >= 0) state.items[idx] = { ...state.items[idx], ...it }
  }
  persist()
  return it as Item
}
export function updateItemPrice(id: number, price: number) {
  const it = state.items.find(x => x.id === id)
  if (!it) return
  it.current_price = price
  const qty = Math.max(1, it.pack_qty || 1)
  it.price_per_unit = +((price ?? 0) / qty).toFixed(2)
  it.updated_at = new Date().toISOString()
  persist()
  return it
}
