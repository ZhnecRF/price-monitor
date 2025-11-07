import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'
import itemsRoute from './routes/items'

// ▼ добавь:
import groupsRoute from './routes/groups'

export let io: Server

export async function startServer() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))
  app.use('/api/groups', groupsRoute)
  app.use('/api/items', itemsRoute)

  const server = http.createServer(app)
  io = new Server(server, { cors: { origin: '*' } })

  const PORT = 18333
  await new Promise<void>((resolve) => server.listen(PORT, () => resolve()))
  return { port: PORT }
}
