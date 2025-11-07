<script setup lang="ts">
import { ref } from 'vue'

const refreshing = ref(false)

async function refreshAll() {
  try {
    refreshing.value = true
    // Проверка связи с бэком — пока просто дергаем health:
    await fetch('http://localhost:18333/api/health')
    // позже заменим на POST /api/refresh
  } catch (e) {
    alert('Бэкенд недоступен: ' + e)
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

  <!-- В дальнейшем здесь будут карточки групп -->
  <div class="alert alert-secondary">
    Каркас готов. Далее добавим карточки групп и таблицы.
  </div>
</template>
