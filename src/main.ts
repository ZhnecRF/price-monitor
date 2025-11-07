import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import './style.css'

const app = createApp(App)

// подключаем роутер — это делает <router-link> кликабельными
app.use(router)

app.mount('#app')

// (необязательно) если нужен ipcRenderer — оставим безопасно
// @ts-expect-error — типы для окна Electron могут отсутствовать
window?.ipcRenderer?.on?.('main-process-message', (_event: any, message: any) => {
  console.log(message)
})
