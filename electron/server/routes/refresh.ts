import { Router } from 'express'
import { request } from 'undici'
import { listGroups, listItemsByGroup, updateItemPrice } from '../../db/jsondb'

const r = Router()

type PR = { price?: number; title?: string }

// ---------- WB (устойчивый) ----------
function wbExtractNmId(url: string): number | null {
  const m = url.match(/\/catalog\/(\d+)\b/i)
  return m ? Number(m[1]) : null
}

async function wbCall(url: string) {
  const { body, statusCode } = await request(url, {
    headers: {
      // обычный браузерный юзер-агент, чтобы не резали
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      'Accept': 'application/json'
    }
  })
  if (statusCode !== 200) return null
  try { return await body.json() } catch { return null }
}

async function parseWB(url: string): Promise<PR> {
  const nm = wbExtractNmId(url)
  if (!nm) return {}

  // 1) v2 без параметров — иногда работает
  let j = await wbCall(`https://card.wb.ru/cards/v2/detail?nm=${nm}`)
  let p = j?.data?.products?.[0]

  // 2) v1 с appType/dest — чаще всего стабильно
  if (!p) {
    j = await wbCall(`https://card.wb.ru/cards/v1/detail?appType=1&curr=rub&dest=-1257786&nm=${nm}`)
    p = j?.data?.products?.[0]
  }

  // 3) v4 с regions/spp — как резерв
  if (!p) {
    j = await wbCall(`https://card.wb.ru/cards/v4/detail?appType=1&curr=rub&dest=-1257786&regions=80,64,38,4,115,83,33,68,70,82,69,86,75,30,71,40,1,66,31,48,22,114&spp=0&nm=${nm}`)
    p = j?.data?.products?.[0]
  }

  if (!p) return {}

  // приоритетная цена: salePriceU (со скидкой), иначе priceU — делим на 100
  const priceU = Number(p.salePriceU ?? p.priceU)
  const price = Number.isFinite(priceU) ? Math.round(priceU) / 100 : undefined
  const title = p?.name ? String(p.name) : undefined
  return { price, title }
}

// ---------- OZON ----------
async function parseOzon(url: string): Promise<PR> {
  try {
    const { body, statusCode } = await request(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 PriceMonitor/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    })
    if (statusCode !== 200) return {}
    const html = await body.text()

    // JSON-LD
    const ld = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
    if (ld) {
      try {
        const data = JSON.parse(ld[1])
        const arr = Array.isArray(data) ? data : [data]
        for (const d of arr) {
          const priceRaw = d?.offers?.price ?? d?.offers?.[0]?.price
          const name = d?.name
          const price = priceRaw ? Number(String(priceRaw).replace(/[^\d.,]/g, '').replace(',', '.')) : undefined
          if (price && Number.isFinite(price)) return { price, title: name || undefined }
        }
      } catch {}
    }

    const mPrice = html.match(/"final_price"\s*:\s*("?)([\d.]+)\1/) ||
                   html.match(/"price"\s*:\s*("?)([\d.]+)\1/)
    const price = mPrice ? Number(mPrice[2]) : undefined

    const mTitle = html.match(/<title>(.*?)<\/title>/i)
    const title = mTitle ? mTitle[1].replace(/\s+\|.*$/, '').trim() : undefined

    return { price: Number.isFinite(price as number) ? (price as number) : undefined, title }
  } catch {
    return {}
  }
}

// ---------- router ----------
async function parseByUrl(url: string): Promise<PR> {
  const host = new URL(url).hostname
  if (host.includes('wildberries')) return await parseWB(url)
  if (host.includes('ozon')) return await parseOzon(url)
  return {}
}

r.post('/', async (req, res) => {
  const groupId = Number(req.body?.group_id || 0)
  const groups = groupId ? [{ id: groupId }] : listGroups()

  const updated: any[] = []
  const errors: any[] = []

  for (const g of groups) {
    const items = listItemsByGroup(g.id)
    for (const it of items) {
      try {
        const { price, title } = await parseByUrl(it.url)
        if (typeof price === 'number') {
          const upd = updateItemPrice(it.id, price)
          if (upd && title && !upd.title) upd.title = title
          updated.push({ id: it.id, price: upd?.current_price, ppu: upd?.price_per_unit })
        } else {
          errors.push({ id: it.id, url: it.url, reason: 'no_price' })
        }
        await new Promise(r => setTimeout(r, 400)) // мягкий троттлинг
      } catch (e: any) {
        errors.push({ id: it.id, url: it.url, error: e?.message || String(e) })
        await new Promise(r => setTimeout(r, 400))
      }
    }
  }

  res.json({ updated_count: updated.length, error_count: errors.length, updated, errors })
})

export default r
