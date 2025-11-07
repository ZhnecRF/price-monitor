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

  // обновление полей товара и пересчёт цены за единицу
r.patch('/:id', (req, res) => {
  const id = Number(req.params.id || 0)
  if (!id) return res.status(400).json({ error: 'Некорректный id' })

  const { custom_name, pack_qty } = req.body || {}
  // В jsondb.ts у нас есть upsertItem и updateItemPrice — здесь обновим поля напрямую через upsertItem:
  try {
    const fields: any = { id }

    if (typeof custom_name !== 'undefined') {
      fields.custom_name = String(custom_name ?? '')
    }
    if (typeof pack_qty !== 'undefined') {
      const qty = Math.max(1, Number(pack_qty) || 1)
      fields.pack_qty = qty
    }

    // Сохраняем изменения
    const updated = upsertItem(fields)

    // Если pack_qty изменили и есть current_price — пересчитаем price_per_unit
    if (typeof fields.pack_qty !== 'undefined' && typeof updated.current_price === 'number') {
      const qty = Math.max(1, updated.pack_qty || 1)
      updated.price_per_unit = +((updated.current_price ?? 0) / qty).toFixed(2)
    }

    res.json(updated)
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Patch error' })
  }
})


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
