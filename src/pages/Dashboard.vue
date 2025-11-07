<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Group = { id: number; name: string; created_at: string }

const refreshing = ref(false)
const loading = ref(true)
const groups = ref<Group[]>([])
const errorMsg = ref<string | null>(null)

async function loadGroups() {
  errorMsg.value = null
  loading.value = true
  try {
    const r = await fetch('http://localhost:18333/api/groups')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    groups.value = await r.json()
  } catch (e: any) {
    errorMsg.value = 'Не удалось загрузить группы: ' + (e?.message || e)
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  // тут позже подключим /api/refresh; пока просто «пинг»
  try {
    refreshing.value = true
    await fetch('http://localhost:18333/api/health')
  } finally {
    refreshing.value = false
  }
}

onMounted(loadGroups)
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h3 class="m-0">Дашборд</h3>
    <div class="d-flex gap-2">
      <router-link to="/items" class="btn btn-outline-secondary">Добавить группу</router-link>
      <button class="btn btn-primary" :disabled="refreshing" @click="refreshAll">
        {{ refreshing ? 'Обновляю…' : 'Обновить все цены' }}
      </button>
    </div>
  </div>

  <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
  <div v-else-if="loading" class="alert alert-secondary">Загружаю группы…</div>
  <div v-else>
    <div v-if="groups.length === 0" class="alert alert-warning">
      Групп пока нет. Нажмите «Добавить группу», чтобы создать первую.
    </div>

    <div class="row g-3" v-else>
      <div class="col-12" v-for="g in groups" :key="g.id">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ g.name }}</strong>
              <small class="text-muted ms-2">ID: {{ g.id }}</small>
            </div>
            <router-link class="btn btn-sm btn-outline-primary" :to="`/items`">
              Управлять товарами
            </router-link>
          </div>
          <div class="card-body p-0">
            <!-- В дальнейшем сюда вставим таблицу товаров группы -->
            <table class="table table-striped table-bordered table-sm m-0">
              <thead class="table-light">
                <tr>
                  <th style="width:60px">№</th>
                  <th style="width:220px">Моё название</th>
                  <th>Название товара</th>
                  <th style="width:160px">Текущая цена</th>
                  <th style="width:160px">Кол-во в упаковке</th>
                  <th style="width:160px">Цена за единицу</th>
                  <th style="width:160px">Маркетплейс</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="7" class="text-muted text-center py-3">
                    Здесь появятся товары этой группы (добавим на следующем шаге)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
