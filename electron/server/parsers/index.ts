// electron/server/index.ts
import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server } from 'socket.io'

import groupsRoute from './routes/groups'
import itemsRoute from './routes/items'
import refreshRoute from './routes/refresh'

export async function startServer() {
  const app = express()

  // Мидлвары
  app.use(cors())
  app.use(express.json({ limit: '2mb' }))

  // Тестовый health-чек
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, ts: Date.now() })
  })

  // Основные маршруты API
  app.use('/api/groups', groupsRoute)
  app.use('/api/items', itemsRoute)
  app.use('/api/refresh', refreshRoute)

  // HTTP + WebSocket сервер
  const server = http.createServer(app)
  const io = new Server(server, {
    cors: { origin: '*' },
  })

  io.on('connection', (socket) => {
    console.log('🔌 Socket.io client connected:', socket.id)
    socket.on('disconnect', () => console.log('❌ Disconnected:', socket.id))
  })

  // Запуск на 18333
  const PORT = 18333
  await new Promise<void>((resolve) => server.listen(PORT, resolve))

  console.log(`✅ Сервер запущен на порту ${PORT}`)
  return { port: PORT }
}
