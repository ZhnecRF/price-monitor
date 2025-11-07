// electron/server/parsers/ozon.ts
import { request } from 'undici'

export type ParseResult = { price?: number; title?: string }

export async function parseOzon(url: string): Promise<ParseResult> {
  try {
    const { body, statusCode } = await request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PriceMonitor/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    if (statusCode !== 200) return {}

    const html = await body.text()

    // 1) JSON-LD <script type="application/ld+json"> ... "offers":{"price": "..."}
    const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (ld) {
      try {
        const data = JSON.parse(ld[1])
        // иногда массив скриптов; нормализуем
        const arr = Array.isArray(data) ? data : [data]
        for (const d of arr) {
          const priceRaw = d?.offers?.price ?? d?.offers?.[0]?.price
          const name = d?.name
          const price = priceRaw ? Number(String(priceRaw).replace(/[^\d.,]/g, '').replace(',', '.')) : undefined
          if (price && Number.isFinite(price)) {
            return { price, title: name || undefined }
          }
        }
      } catch {}
    }

    // 2) Фолыбэк: выдернем "final_price" или "price" из встраиваемых JSON
    const mPrice = html.match(/"final_price"\s*:\s*("?)([\d.]+)\1/) ||
                   html.match(/"price"\s*:\s*("?)([\d.]+)\1/)
    const price = mPrice ? Number(mPrice[2]) : undefined

    // 3) Попробуем title
    const mTitle = html.match(/<title>(.*?)<\/title>/i)
    const title = mTitle ? mTitle[1].replace(/\s+\|.*$/, '').trim() : undefined

    return { price: Number.isFinite(price as number) ? (price as number) : undefined, title }
  } catch {
    return {}
  }
}
