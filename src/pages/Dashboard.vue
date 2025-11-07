<script setup lang="ts">
/* ... твой текущий код выше ... */

import { onBeforeUnmount } from 'vue'

// ── Директива: v-resizable-col ───────────────────────────────
// Делает <th> перетягиваемым. Ключ сохраняем в localStorage.
const colWidths = ref<Record<string, number>>(
  JSON.parse(localStorage.getItem('pm_col_widths') || '{}')
)

function saveWidths() {
  localStorage.setItem('pm_col_widths', JSON.stringify(colWidths.value))
}

function makeResizable(el: HTMLElement, key: string, min = 80, max = 600) {
  // применим сохранённую ширину, если есть
  const saved = colWidths.value[key]
  if (saved) {
    el.style.width = saved + 'px'
  }

  const handle = document.createElement('span')
  handle.style.cssText = `
    position:absolute; right:0; top:0; width:6px; height:100%;
    cursor:col-resize; user-select:none;
  `
  el.style.position = 'relative'
  el.appendChild(handle)

  let startX = 0
  let startW = 0
  const onMove = (e: MouseEvent) => {
    const dx = e.clientX - startX
    let w = Math.max(min, Math.min(max, startW + dx))
    el.style.width = w + 'px'
    colWidths.value[key] = w
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    saveWidths()
  }
  const onDown = (e: MouseEvent) => {
    startX = e.clientX
    startW = el.getBoundingClientRect().width
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }
  handle.addEventListener('mousedown', onDown)

  return () => {
    handle.removeEventListener('mousedown', onDown)
    handle.remove()
  }
}

const vResizableCol = {
  mounted(el: HTMLElement, binding: any) {
    const key = String(binding.value || '')
    (el as any).__cleanup = makeResizable(el, key)
  },
  unmounted(el: HTMLElement) {
    const fn = (el as any).__cleanup
    if (fn) fn()
  }
}
// ─────────────────────────────────────────────────────────────

/* ... остальной твой код ниже ... */
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
                  <th v-resizable-col="'custom_name'" style="min-width:200px">Моё название</th>
                  <th v-resizable-col="'title'">Название товара</th>
                  <th v-resizable-col="'current_price'" style="width:150px">Текущая цена</th>
                  <th v-resizable-col="'pack_qty'" style="width:170px">Кол-во в упаковке</th>
                  <th v-resizable-col="'price_per_unit'" style="width:160px">Цена за единицу</th>
                  <th v-resizable-col="'marketplace'" style="width:160px">Маркетплейс</th>
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
