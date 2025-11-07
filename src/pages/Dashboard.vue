<script setup lang="ts">
import { ref, onMounted } from 'vue'

type Group = { id: number; name: string; created_at: string }
type Item = {
  id: number
  group_id: number
  url: string
  marketplace?: string
  title?: string
  custom_name?: string
  pack_qty?: number
  current_price?: number
  price_per_unit?: number
  updated_at?: string
}

const refreshing = ref(false)
const loading = ref(true)
const groups = ref<Group[]>([])
const itemsByGroup = ref<Record<number, Item[]>>({})
const errorMsg = ref<string | null>(null)
const savingCell = ref<number | null>(null) // id товара, который сейчас сохраняем

async function loadGroups() {
  errorMsg.value = null
  loading.value = true
  try {
    const r = await fetch('http://localhost:18333/api/groups')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    groups.value = await r.json()

    // подтянем товары для каждой группы
    const map: Record<number, Item[]> = {}
    for (const g of groups.value) {
      const rr = await fetch(`http://localhost:18333/api/items?group_id=${g.id}`)
      map[g.id] = rr.ok ? await rr.json() : []
    }
    itemsByGroup.value = map
  } catch (e:any) {
    errorMsg.value = 'Не удалось загрузить данные: ' + (e?.message || e)
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  try {
    refreshing.value = true
    await fetch('http://localhost:18333/api/health')
    await loadGroups()
  } finally {
    refreshing.value = false
  }
}

async function updateItemField(item: Item, patch: Partial<Item>) {
  savingCell.value = item.id
  try {
    const res = await fetch(`http://localhost:18333/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const updated = await res.json()
    // обновим локально
    const arr = itemsByGroup.value[item.group_id] || []
    const idx = arr.findIndex(i => i.id === item.id)
    if (idx >= 0) arr[idx] = updated
  } catch (e) {
    alert('Не удалось сохранить: ' + (e as any)?.message)
  } finally {
    savingCell.value = null
  }
}

onMounted(loadGroups)
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-3">
    <h3 class="m-0">Дашборд</h3>
    <div class="d-flex gap-2">
      <router-link to="/items" class="btn btn-outline-secondary">Добавить группу/товары</router-link>
      <button class="btn btn-primary" :disabled="refreshing" @click="refreshAll">
        {{ refreshing ? 'Обновляю…' : 'Обновить все цены' }}
      </button>
    </div>
  </div>

  <div v-if="errorMsg" class="alert alert-danger">{{ errorMsg }}</div>
  <div v-else-if="loading" class="alert alert-secondary">Загружаю…</div>

  <div v-else>
    <div v-if="groups.length === 0" class="alert alert-warning">
      Групп пока нет. Перейдите в раздел «Товары», чтобы добавить первую.
    </div>

    <div class="row g-3" v-else>
      <div class="col-12" v-for="g in groups" :key="g.id">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{{ g.name }}</strong>
              <small class="text-muted ms-2">ID: {{ g.id }}</small>
            </div>
            <router-link class="btn btn-sm btn-outline-primary" :to="`/items`">Управлять товарами</router-link>
          </div>

          <div class="card-body p-0">
            <table class="table table-striped table-bordered table-sm m-0">
              <thead class="table-light">
                <tr>
                  <th style="width:60px">№</th>
                  <th style="min-width:200px">Моё название</th>
                  <th>Название товара</th>
                  <th style="width:150px">Текущая цена</th>
                  <th style="width:170px">Кол-во в упаковке</th>
                  <th style="width:160px">Цена за единицу</th>
                  <th style="width:160px">Маркетплейс</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="(itemsByGroup[g.id] || []).length === 0">
                  <td colspan="7" class="text-muted text-center py-3">
                    В этой группе пока нет товаров. Добавьте ссылки на странице «Товары».
                  </td>
                </tr>

                <tr v-for="(it, idx) in (itemsByGroup[g.id] || [])" :key="it.id">
                  <td>{{ idx + 1 }}</td>

                  <!-- Моё название: inline input -->
                  <td style="min-width:200px;">
                    <input
                      class="form-control form-control-sm"
                      :disabled="savingCell === it.id"
                      v-model="it.custom_name"
                      @change="updateItemField(it, { custom_name: it.custom_name || '' })"
                      placeholder="Введите своё название"
                    />
                  </td>

                  <!-- Название товара (пока заглушка, появится после парсинга) -->
                  <td>{{ it.title || '—' }}</td>

                  <!-- Текущая цена -->
                  <td>{{ typeof it.current_price === 'number' ? it.current_price.toFixed(2) : '—' }}</td>

                  <!-- Кол-во в упаковке: inline input с пересчётом -->
                  <td>
                    <input
                      type="number"
                      min="1"
                      class="form-control form-control-sm"
                      style="max-width: 120px"
                      :disabled="savingCell === it.id"
                      v-model.number="it.pack_qty"
                      @change="updateItemField(it, { pack_qty: it.pack_qty || 1 })"
                      placeholder="шт."
                    />
                  </td>

                  <!-- Цена за единицу (с бэка, если есть; иначе подсчёт на лету) -->
                  <td>
                    {{
                      typeof it.price_per_unit === 'number'
                        ? it.price_per_unit.toFixed(2)
                        : (typeof it.current_price === 'number' && (it.pack_qty || 1) > 0)
                          ? (it.current_price / Math.max(1, it.pack_qty || 1)).toFixed(2)
                          : '—'
                    }}
                  </td>

                  <td>{{ it.marketplace || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>
