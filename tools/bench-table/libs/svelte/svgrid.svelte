<script lang="ts" module>
	export const sel = {
		selectAll: 'thead .sv-grid-selection-column [role="checkbox"]',
		sort: 'thead [data-svgrid-header-col="name"] .sv-grid-header-sort',
	}
</script>

<script lang="ts">
	import { SvGrid, type GridColumns } from '@svgrid/grid'
	import { COLUMNS, type TRec } from '../data'

	/**
	 * SvGrid (`@svgrid/grid`) — грид на рунах Svelte 5: сортировка заголовком
	 * (`sortable`) и колонка выбора с чекбоксом «выбрать все» в шапке
	 * (`showRowSelection`) встроены, строки сверяются по `getRowId`. Окно строк и
	 * колонок у него по умолчанию; без флага `virtual` оба выключены
	 * (`virtualization`, `columnVirtualization`), с флагом — грид в контейнере
	 * высотой 800 px, как окно soldy.
	 */
	const { rows }: { rows: TRec[] } = $props()
	const virtual = new URLSearchParams(location.search).get('virtual') === '1'
	const columns: GridColumns<TRec> = COLUMNS.map((c) => ({ field: c.field, header: c.text }))
	const getRowId = (r: TRec) => String(r.id)
</script>

{#if virtual}
	<div class="bench-scroll" style="height: 800px">
		<SvGrid data={rows} {columns} sortable showRowSelection {getRowId} />
	</div>
{:else}
	<SvGrid
		data={rows}
		{columns}
		sortable
		showRowSelection
		{getRowId}
		virtualization={false}
		columnVirtualization={false}
	/>
{/if}
