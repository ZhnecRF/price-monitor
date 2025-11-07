import { Router } from 'express'
import { listItemsByGroup, upsertItem } from '../../db/jsondb'

const r = Router()

// список товаров по группе
r.get('/', (req, res) => {
  const groupId = Number(req.query.group_id || 0)
  if (!groupId) return res.status(400).json({ error: 'group_id обязателен' })
  return res.json(listItemsByGroup(groupId))
})

// пакетное добавление ссылок (до 10)
r.post('/batch', (req, res) => {
  const { group_id, urls } = req.body || {}
  const groupId = Number(group_id || 0)
  if (!groupId) return res.status(400).json({ error: 'group_id обязателен' })

  const arr: string[] = Array.isArray(urls) ? urls : []
  const clean = arr
    .map((u) => String(u || '').trim())
    .filter((u) => u.length > 0)
    .slice(0, 10)

  const results = clean.map((url) => {
    const marketplace = detectMarketplace(url)
    // Заглушки: заголовок возьмём позже парсером; сейчас только URL/маркетплейс
    return upsertItem({
      group_id: groupId,
      url,
      marketplace,
      title: null,
      pack_qty: 1,
      custom_name: ''
    })
  })
  res.status(201).json(results)
})

function detectMarketplace(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname
    if (h.includes('wildberries')) return 'Wildberries'
    if (h.includes('ozon')) return 'Ozon'
    if (h.includes('y_market') || h.includes('market.yandex')) return 'Yandex Market'
    if (h.includes('aliexpress')) return 'AliExpress'
    return h
  } catch {
    return 'Unknown'
  }
}

export default r
