import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from './router'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'

createApp(App).mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})
