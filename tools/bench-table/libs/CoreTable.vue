<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import {
	TItemContext,
	TTableCollectionFacade,
	TTableRowCollectionFacade,
	type ITableRow,
} from '@soldy-ui/core'
import { COLUMNS, type TRec } from './data'

/**
 * Опыт «ядро без проводки»: коллекция таблицы soldy (выбор, сортировка,
 * ячейки строк) как есть, а рисует её голый `v-for`, как у TanStack. Нет ни
 * компонентов строк, ни адаптерных контекстов, ни обмена: после действия
 * перерисовывается вся таблица (`tick`). Разница с `soldy` — цена проводки
 * на строку, разница с `plain` — цена модели ядра.
 */
const props = defineProps<{ data: TRec[] }>()
const facade = new TTableCollectionFacade({
	items: props.data.map((data) => ({ data })),
	trackBy: (row) => row.data?.id,
	columns: COLUMNS.map((c) => ({ ...c, sortable: true })),
	mode: 'multiple',
})
const tick = shallowRef(0)
const rowFacades = new WeakMap<ITableRow, TTableRowCollectionFacade>()

/** Фасад строки — на первый показ, как его заводит монтирование `Table.Row`. */
function rowOf(row: ITableRow) {
	let found = rowFacades.get(row)
	if (!found) {
		found = new TTableRowCollectionFacade()
		found.setContext(new TItemContext(row, facade.engine.getCore().extensions))
		rowFacades.set(row, found)
	}
	return found
}
/** Показанные строки с фасадами; читает `tick` — перерисовка всей таблицы на действие. */
function view() {
	return tick.value >= 0 ? facade.shown.map((row) => ({ row, r: rowOf(row) })) : []
}
function act(action: () => void) {
	action()
	tick.value++
}
watch(
	() => props.data,
	(data) => act(() => (facade.items = data.map((d) => ({ data: d })))),
)
</script>

<template>
	<table>
		<thead>
			<tr>
				<th>
					<input
						type="checkbox"
						:checked="facade.shownSelection === 'all'"
						@change="
							act(() =>
								facade.shownSelection === 'all'
									? facade.deselectShown()
									: facade.selectShown(),
							)
						"
					/>
				</th>
				<th
					v-for="c in COLUMNS"
					:key="c.field"
					:data-col="c.field"
					@click="act(() => facade.toggleSort(c.field))"
				>
					{{ c.text }}
				</th>
			</tr>
		</thead>
		<tbody>
			<tr v-for="{ row, r } in view()" :key="row.uid" :data-selected="r.selected">
				<td>
					<input
						type="checkbox"
						:checked="r.selected"
						@change="act(() => (r.selected = !r.selected))"
					/>
				</td>
				<td v-for="cell in r.cells" :key="cell.column.uid" v-bind="cell.dataset">
					{{ cell.value }}
				</td>
			</tr>
		</tbody>
	</table>
</template>
