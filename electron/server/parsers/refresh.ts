// electron/server/routes/refresh.ts
import { Router } from 'express'
import { parseByUrl } from '../parsers'
import { listItemsByGroup, updateItemPrice } from '../../db/jsondb'
import { listGroups } from '../../db/jsondb'

const r = Router()

r.post('/', async (req, res) => {
  const groupId = Number(req.body?.group_id || 0)

  // возьмём список групп (если group_id не задан — все группы)
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
        // маленькая пауза, чтобы не долбить слишком часто
        await new Promise((r) => setTimeout(r, 400))
      } catch (e: any) {
        errors.push({ id: it.id, url: it.url, error: e?.message || String(e) })
        await new Promise((r) => setTimeout(r, 400))
      }
    }
  }

  res.json({ updated_count: updated.length, error_count: errors.length, updated, errors })
})

export default r
