<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { COLUMNS, type TRec } from './data'

/**
 * Нижняя граница: таблица на голом Vue — `v-for` по строкам, нативные
 * чекбоксы, выбор в реактивном `Set`, сортировка по клику на заголовок.
 * Ни доступности сверх тегов, ни клавиатуры — только то, что мерит стенд.
 */
const props = defineProps<{ data: TRec[] }>()
const collator = new Intl.Collator(undefined, { numeric: true })
const sortField = ref<string | null>(null)
const sortDir = ref<1 | -1>(1)
const selected = reactive(new Set<string | number>())

const shown = computed(() => {
	const field = sortField.value
	if (!field) return props.data
	const dir = sortDir.value
	return [...props.data].sort(
		(a, b) => dir * collator.compare(String(a[field]), String(b[field])),
	)
})
const allSelected = computed(() => props.data.length > 0 && selected.size === props.data.length)

function toggleAll() {
	if (allSelected.value) selected.clear()
	else for (const r of props.data) selected.add(r.id)
}
function toggle(id: string | number) {
	if (selected.has(id)) selected.delete(id)
	else selected.add(id)
}
function sortBy(field: string) {
	if (sortField.value === field) sortDir.value = sortDir.value === 1 ? -1 : 1
	else {
		sortField.value = field
		sortDir.value = 1
	}
}
</script>

<template>
	<table>
		<thead>
			<tr>
				<th><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
				<th
					v-for="c in COLUMNS"
					:key="c.field"
					:data-col="c.field"
					@click="sortBy(c.field)"
				>
					{{ c.text }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="r in shown" :key="r.id">
				<td>
					<input type="checkbox" :checked="selected.has(r.id)" @change="toggle(r.id)" />
				</td>
				<td v-for="c in COLUMNS" :key="c.field">{{ r[c.field] }}</td>
			</tr>
		</tbody>
	</table>
</template>
