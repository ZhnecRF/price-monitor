// electron/server/parsers/index.ts
import { parseWB } from './wb'
import { parseOzon } from './ozon'

export async function parseByUrl(url: string): Promise<{ price?: number; title?: string }> {
  const host = new URL(url).hostname
  if (host.includes('wildberries')) return await parseWB(url)
  if (host.includes('ozon')) return await parseOzon(url)
  // можно добавить: yandex market, aliexpress и т.д.
  return {}
}
