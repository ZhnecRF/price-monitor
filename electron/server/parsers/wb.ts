// electron/server/parsers/wb.ts
import { request } from 'undici'

export type ParseResult = { price?: number; title?: string }

function extractNmId(url: string): number | null {
  // Подходит для: /catalog/123456/detail.aspx или .../catalog/123456..
  const m = url.match(/\/catalog\/(\d+)\b/i)
  return m ? Number(m[1]) : null
}

export async function parseWB(url: string): Promise<ParseResult> {
  const nm = extractNmId(url)
  if (!nm) return {}

  // card API (официальный публичный)
  const api = `https://card.wb.ru/cards/v2/detail?nm=${nm}`
  const { body, statusCode } = await request(api, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PriceMonitor/1.0',
      'Accept': 'application/json'
    }
  })
  if (statusCode !== 200) return {}

  const json = await body.json()
  const p = json?.data?.products?.[0]
  if (!p) return {}

  // приоритет: salePriceU, иначе priceU — делим на 100
  const priceU = Number(p.salePriceU ?? p.priceU)
  const price = Number.isFinite(priceU) ? Math.round(priceU) / 100 : undefined
  const title = String(p.name || '') || undefined

  return { price, title }
}
