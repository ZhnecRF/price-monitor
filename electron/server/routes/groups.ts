import { Router } from 'express'
import { getDb } from '../../db/sqlite'

const r = Router()

// список групп
r.get('/', (_req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, name, created_at FROM groups ORDER BY id DESC').all()
  res.json(rows)
})

// создать группу
r.post('/', (req, res) => {
  const { name } = req.body || {}
  if (!name || String(name).trim().length < 2) {
    return res.status(400).json({ error: 'Укажите название группы (мин. 2 символа)' })
  }
  const db = getDb()
  const stmt = db.prepare('INSERT INTO groups (name) VALUES (?)')
  const info = stmt.run(String(name).trim())
  const row = db.prepare('SELECT id, name, created_at FROM groups WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(row)
})

export default r
