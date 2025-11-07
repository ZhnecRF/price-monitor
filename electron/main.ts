import { app, BrowserWindow } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// ▼ добавили
import { migrate } from './db/sqlite'
import { startServer } from './server'

// ▼ ШИМЫ ДЛЯ CJS-ГЛОБАЛОВ (важно в ESM):
const __FILENAME__ = fileURLToPath(import.meta.url)
const __DIRNAME__ = path.dirname(__FILENAME__)
// делаем доступными как «обычные» __filename/__dirname для либ, которые их ожидают
;(global as any).__filename = __FILENAME__
;(global as any).__dirname = __DIRNAME__

// на всякий случай логируем необработанные промисы:
process.on('unhandledRejection', (err) => {
  console.error('❌ UnhandledRejection:', err)
})
process.on('uncaughtException', (err) => {
  console.error('❌ UncaughtException:', err)
})

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      sandbox: false
    }
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Закрытие окна
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ▼ ВАЖНО: запускаем миграции и сервер ПЕРЕД созданием окна
app.whenReady().then(async () => {
  try {
    console.log('🚀 Инициализация БД…')
    migrate()

    console.log('🌐 Запуск сервера…')
    const { port } = await startServer()
    console.log('✅ Сервер запущен на порту', port)
  } catch (e) {
    console.error('❌ Ошибка при запуске сервера:', e)
  }

  createWindow()
})
