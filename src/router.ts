import { createRouter, createWebHashHistory } from 'vue-router'

const Dashboard = () => import('./pages/Dashboard.vue')
const Items = () => import('./pages/Items.vue')

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: Dashboard },
    { path: '/items', name: 'items', component: Items }
  ]
})
