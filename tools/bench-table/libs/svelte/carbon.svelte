<script lang="ts" module>
	export const sel = {
		selectAll: 'thead .bx--table-column-checkbox input[type="checkbox"]',
		sort: 'thead .bx--table-sort',
	}
</script>

<script lang="ts">
	import 'carbon-components-svelte/css/white.css'
	import { DataTable } from 'carbon-components-svelte'
	import { COLUMNS, type TRec } from '../data'

	/**
	 * Carbon Components Svelte `DataTable`: сортировка заголовком (`sortable`) и
	 * выбор строк с чекбоксом «выбрать все» в шапке (`selectable` +
	 * `batchSelection`) встроены, строки сверяются по `id`. Окно —
	 * `virtualize`, его выключенным оставляет умолчание. Компоненты библиотеки —
	 * в синтаксисе Svelte 4, Svelte 5 их компилирует в режиме совместимости.
	 */
	const { rows }: { rows: TRec[] } = $props()
	const headers = COLUMNS.map((c) => ({ key: c.field, value: c.text }))
</script>

<DataTable sortable selectable batchSelection {headers} {rows} />
