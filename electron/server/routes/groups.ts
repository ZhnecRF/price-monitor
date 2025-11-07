import { Router } from 'express'
import { createGroup, listGroups } from '../../db/jsondb'

const r = Router()

// список групп
r.get('/', (_req, res) => {
  res.json(listGroups())
})

// создать группу
r.post('/', (req, res) => {
  const name: string = (req.body?.name || '').trim()
  if (name.length < 2) return res.status(400).json({ error: 'Укажите название группы (мин. 2 символа)' })
  const g = createGroup(name)
  res.status(201).json(g)
})

export default r
