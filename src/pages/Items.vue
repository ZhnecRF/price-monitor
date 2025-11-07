<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Group = { id: number; name: string; created_at: string }
const groups = ref<Group[]>([])
const selectedGroupId = ref<number | null>(null)

const links = ref<string[]>(Array(10).fill(''))
const saving = ref(false)
const resultMsg = ref<string | null>(null)
const errorMsg = ref<string | null>(null)

async function loadGroups() {
  const r = await fetch('http://localhost:18333/api/groups')
  groups.value = await r.json()
  if (!selectedGroupId.value && groups.value.length) {
    selectedGroupId.value = groups.value[0].id
  }
}

async function saveLinks() {
  resultMsg.value = null
  errorMsg.value = null
  if (!selectedGroupId.value) {
    errorMsg.value = 'Выберите группу'
    return
  }
  const urls = links.value.map(v => v.trim()).filter(v => v.length > 0).slice(0, 10)
  if (urls.length === 0) {
    errorMsg.value = 'Введите хотя бы одну ссылку'
    return
  }
  saving.value = true
  try {
    const res = await fetch('http://localhost:18333/api/items/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: selectedGroupId.value, urls })
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      throw new Error(j?.error || `HTTP ${res.status}`)
    }
    const created = await res.json()
    resultMsg.value = `Добавлено товаров: ${created.length}`
    // очистим форму
    links.value = Array(10).fill('')
  } catch (e:any) {
    errorMsg.value = 'Ошибка сохранения: ' + (e?.message || e)
  } finally {
    saving.value = false
  }
}

onMounted(loadGroups)
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h3 class="m-0">Товары</h3>
    <router-link class="btn btn-outline-secondary" to="/">Назад</router-link>
  </div>

  <div class="card mb-3">
    <div class="card-header">Добавить группу товаров</div>
    <div class="card-body d-flex gap-2 align-items-end">
      <input class="form-control" placeholder="Название группы (создание ниже опустим — уже есть)" disabled />
      <router-link to="/" class="btn btn-outline-secondary">На дашборд</router-link>
    </div>
    <div class="card-footer text-muted">
      Группы создавали ранее. Сейчас добавим ссылки к существующей группе.
    </div>
  </div>

  <div class="card">
    <div class="card-header">Добавить ссылки в группу</div>
    <div class="card-body">
      <div class="mb-3">
        <label class="form-label">Выберите группу</label>
        <select class="form-select" v-model.number="selectedGroupId">
          <option v-for="g in groups" :key="g.id" :value="g.id">
            {{ g.name }} (ID: {{ g.id }})
          </option>
        </select>
      </div>

      <div class="row g-2">
        <div class="col-12" v-for="(v, i) in links" :key="i">
          <input class="form-control" v-model="links[i]" :placeholder="`Ссылка #${i+1} (WB/Ozon/…)`" />
        </div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-primary" :disabled="saving" @click="saveLinks">
          {{ saving ? 'Сохраняю…' : 'Сохранить ссылки' }}
        </button>
        <router-link to="/" class="btn btn-outline-secondary">На дашборд</router-link>
      </div>

      <div class="mt-3">
        <div v-if="resultMsg" class="alert alert-success">{{ resultMsg }}</div>
        <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
      </div>
    </div>
  </div>
</template>
