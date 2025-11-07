<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

type Group = { id: number; name: string; created_at: string }
type Item = {
  id: number; group_id: number; url: string
  marketplace?: string; title?: string; custom_name?: string
  pack_qty?: number; current_price?: number; price_per_unit?: number
  updated_at?: string
}

const refreshing = ref(false)
const loading = ref(true)
const groups = ref<Group[]>([])
const itemsByGroup = ref<Record<number, Item[]>>({})
const errorMsg = ref<string | null>(null)
const savingCell = ref<number | null>(null)

// ── ресайз колонок ─────────────────────────────────────────────
const colWidths = ref<Record<string, number>>(
  JSON.parse(localStorage.getItem('pm_col_widths') || '{}')
)
function saveWidths(){ localStorage.setItem('pm_col_widths', JSON.stringify(colWidths.value)) }
function makeResizable(el: HTMLElement, key: string, min = 80, max = 600) {
  const saved = colWidths.value[key]; if (saved) el.style.width = saved + 'px'
  const handle = document.createElement('span')
  handle.style.cssText = 'position:absolute;right:0;top:0;width:6px;height:100%;cursor:col-resize;user-select:none;'
  el.style.position = 'relative'; el.appendChild(handle)
  let startX=0, startW=0
  const onMove = (e: MouseEvent) => { const w = Math.max(min, Math.min(max, startW + (e.clientX-startX))); el.style.width = w+'px'; colWidths.value[key]=w }
  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); saveWidths() }
  const onDown = (e: MouseEvent) => { startX=e.clientX; startW=el.getBoundingClientRect().width; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp) }
  handle.addEventListener('mousedown', onDown)
  return () => { handle.removeEventListener('mousedown', onDown); handle.remove() }
}
const vResizableCol = {
  mounted(el: HTMLElement, binding: any){ (el as any).__cleanup = makeResizable(el, String(binding.value||'')) },
  unmounted(el: HTMLElement){ const fn = (el as any).__cleanup; if(fn) fn() }
}
// ───────────────────────────────────────────────────────────────

// сорт/фильтр
type SortKey = 'idx'|'custom_name'|'title'|'current_price'|'pack_qty'|'price_per_unit'|'marketplace'
type SortDir = 'asc'|'desc'
const sortKey = ref<Record<number, SortKey>>({})
const sortDir = ref<Record<number, SortDir>>({})
const filterMinPPU = ref<Record<number, string>>({})
const filterMaxPPU = ref<Record<number, string>>({})
function toggleSort(gid: number, key: SortKey){
  if (sortKey.value[gid] !== key){ sortKey.value[gid]=key; sortDir.value[gid]='asc' }
  else { sortDir.value[gid] = (sortDir.value[gid]==='asc')?'desc':'asc' }
}
function ppuOf(it: Item){
  if (typeof it.price_per_unit === 'number') return it.price_per_unit
  if (typeof it.current_price === 'number'){ const q=Math.max(1, it.pack_qty||1); return it.current_price/q }
  return undefined
}
const viewItemsByGroup = computed(() => {
  const res: Record<number, Item[]> = {}
  for (const g of groups.value){
    const src = itemsByGroup.value[g.id] || []
    const min = parseFloat(filterMinPPU.value[g.id] || ''), max = parseFloat(filterMaxPPU.value[g.id] || '')
    const hasMin=!Number.isNaN(min), hasMax=!Number.isNaN(max)
    let arr = src.filter(it => { const p=ppuOf(it); if(p===undefined) return true; if(hasMin && p<min) return false; if(hasMax && p>max) return false; return true })
    const sk = sortKey.value[g.id] || 'idx', sd = sortDir.value[g.id] || 'asc', mul = sd==='asc'?1:-1
    arr = arr.map((it,idx)=>({it,idx})).sort((a,b)=>{
      const A=a.it, B=b.it
      switch(sk){
        case 'idx': return (a.idx-b.idx)*mul
        case 'custom_name': return String(A.custom_name||'').localeCompare(String(B.custom_name||''))*mul
        case 'title': return String(A.title||'').localeCompare(String(B.title||''))*mul
        case 'current_price': return ((A.current_price??-1e12)-(B.current_price??-1e12))*mul
        case 'pack_qty': return ((A.pack_qty??0)-(B.pack_qty??0))*mul
        case 'price_per_unit': return ((ppuOf(A)??-1e12)-(ppuOf(B)??-1e12))*mul
        case 'marketplace': return String(A.marketplace||'').localeCompare(String(B.marketplace||''))*mul
      }
    }).map(x=>x.it)
    res[g.id]=arr
  }
  return res
})

// загрузка/обновления
async function loadGroups(){
  errorMsg.value=null; loading.value=true
  try{
    const r = await fetch('http://localhost:18333/api/groups'); if(!r.ok) throw new Error(`HTTP ${r.status}`)
    groups.value = await r.json()
    const map: Record<number, Item[]> = {}
    for (const g of groups.value){
      const rr = await fetch(`http://localhost:18333/api/items?group_id=${g.id}`)
      map[g.id] = rr.ok ? await rr.json() : []
      if (!sortKey.value[g.id]) sortKey.value[g.id]='idx'
      if (!sortDir.value[g.id]) sortDir.value[g.id]='asc'
    }
    itemsByGroup.value = map
  } catch(e:any){ errorMsg.value = 'Не удалось загрузить данные: '+(e?.message||e) }
  finally{ loading.value=false }
}
async function refreshAll(){ try{ refreshing.value=true; await fetch('http://localhost:18333/api/health'); await loadGroups() } finally{ refreshing.value=false } }
async function updateItemField(item: Item, patch: Partial<Item>){
  savingCell.value=item.id
  try{
    const res = await fetch(`http://localhost:18333/api/items/${item.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(patch) })
    if(!res.ok) throw new Error(`HTTP ${res.status}`)
    const updated = await res.json()
    const arr = itemsByGroup.value[item.group_id] || []; const idx = arr.findIndex(i=>i.id===item.id); if(idx>=0) arr[idx]=updated
  } catch(e:any){ alert('Не удалось сохранить: '+(e?.message||e)) }
  finally{ savingCell.value=null }
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
          <div class="card-header">
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <strong>{{ g.name }}</strong>
                <small class="text-muted ms-2">ID: {{ g.id }}</small>
              </div>
              <div class="d-flex flex-wrap align-items-center gap-2">
                <div class="input-group input-group-sm" style="width: 280px;">
                  <span class="input-group-text">Фильтр, ₽/шт</span>
                  <input type="number" step="0.01" class="form-control" placeholder="Мин" v-model="filterMinPPU[g.id]" />
                  <input type="number" step="0.01" class="form-control" placeholder="Макс" v-model="filterMaxPPU[g.id]" />
                </div>
                <div class="input-group input-group-sm" style="width: 240px;">
                  <span class="input-group-text">Сортировать по</span>
                  <select class="form-select" v-model="sortKey[g.id]">
                    <option value="idx">Порядок</option>
                    <option value="custom_name">Моё название</option>
                    <option value="title">Название товара</option>
                    <option value="current_price">Текущая цена</option>
                    <option value="pack_qty">Кол-во в упаковке</option>
                    <option value="price_per_unit">Цена за единицу</option>
                    <option value="marketplace">Маркетплейс</option>
                  </select>
                  <button class="btn btn-outline-secondary" @click="toggleSort(g.id, sortKey[g.id] || 'idx')">
                    {{ (sortDir[g.id] || 'asc') === 'asc' ? '↑' : '↓' }}
                  </button>
                </div>
              </div>
            </div>
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
                <tr v-if="(viewItemsByGroup[g.id] || []).length === 0">
                  <td colspan="7" class="text-muted text-center py-3">В этой группе нет товаров под активные фильтры.</td>
                </tr>
                <tr v-for="(it, idx) in (viewItemsByGroup[g.id] || [])" :key="it.id">
                  <td>{{ idx + 1 }}</td>
                  <td style="min-width:200px;">
                    <input class="form-control form-control-sm" :disabled="savingCell===it.id"
                      v-model="it.custom_name" @change="updateItemField(it,{ custom_name: it.custom_name || '' })"
                      placeholder="Введите своё название"/>
                  </td>
                  <td>{{ it.title || '—' }}</td>
                  <td>{{ typeof it.current_price==='number' ? it.current_price.toFixed(2) : '—' }}</td>
                  <td>
                    <input type="number" min="1" class="form-control form-control-sm" style="max-width:120px"
                      :disabled="savingCell===it.id" v-model.number="it.pack_qty"
                      @change="updateItemField(it,{ pack_qty: it.pack_qty || 1 })" placeholder="шт."/>
                  </td>
                  <td>
                    {{
                      typeof it.price_per_unit==='number'
                        ? it.price_per_unit.toFixed(2)
                        : (typeof it.current_price==='number' && (it.pack_qty||1)>0)
                          ? (it.current_price/Math.max(1,it.pack_qty||1)).toFixed(2)
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
