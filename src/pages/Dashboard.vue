<script setup lang="ts">
import { ref } from 'vue'

const refreshing = ref(false)

async function refreshAll() {
  try {
    refreshing.value = true
    // пока просто пингуем бэкенд (кнопка должна быть видна и нажиматься)
    const r = await fetch('http://localhost:18333/api/health')
    if (!r.ok) throw new Error('Backend health failed')
    // позже поменяем на POST /api/refresh
  } catch (e:any) {
    alert('Бэкенд недоступен: ' + (e?.message || e))
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h3 class="m-0">Дашборд</h3>
    <button class="btn btn-primary" :disabled="refreshing" @click="refreshAll">
      {{ refreshing ? 'Обновляю…' : 'Обновить все цены' }}
    </button>
  </div>

  <div class="card">
    <div class="card-body">
      Каркас готов. Далее добавим карточки групп и таблицы.
    </div>
  </div>
</template>
