<script setup lang="ts">
import { ref } from 'vue'

const groupName = ref('')
const creating = ref(false)
const resultMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

async function createGroup() {
  resultMsg.value = null
  errorMsg.value = null

  const name = groupName.value.trim()
  if (name.length < 2) {
    errorMsg.value = 'Введите название группы (мин. 2 символа)'
    return
  }

  creating.value = true
  try {
    const res = await fetch('http://localhost:18333/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error || `HTTP ${res.status}`)
    }
    const created = await res.json()
    resultMsg.value = `Группа создана (id: ${created.id}, "${created.name}")`
    groupName.value = ''
  } catch (e: any) {
    errorMsg.value = 'Ошибка создания: ' + (e?.message || e)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h3 class="m-0">Товары</h3>
    <router-link class="btn btn-outline-secondary" to="/">Назад</router-link>
  </div>

  <div class="card mb-3">
    <div class="card-header">Добавить группу товаров</div>
    <div class="card-body">
      <div class="mb-3">
        <label class="form-label">Название группы товаров</label>
        <input class="form-control" v-model="groupName" placeholder="Например: Подгузники / Маски K-Skin" />
      </div>

      <div class="d-flex gap-2">
        <button class="btn btn-primary" :disabled="creating" @click="createGroup">
          {{ creating ? 'Создаю…' : 'Сохранить группу' }}
        </button>
        <router-link class="btn btn-outline-secondary" to="/">Назад на дашборд</router-link>
      </div>

      <div class="mt-3">
        <div v-if="resultMsg" class="alert alert-success">{{ resultMsg }}</div>
        <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
      </div>
    </div>
  </div>

  <div class="alert alert-secondary">
    На следующем шаге добавим список групп и переход к заполнению товаров.
  </div>
</template>
