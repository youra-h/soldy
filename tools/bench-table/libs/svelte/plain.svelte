<script lang="ts" module>
	export const sel = {
		selectAll: 'thead input[type="checkbox"]',
		sort: 'thead th[data-col="name"]',
	}
</script>

<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity'
	import { COLUMNS, type TRec } from '../data'
	import { nextSort, sorted, type TSort } from '../sort'

	/**
	 * Нижняя граница: таблица на голом Svelte — `#each` по строкам с ключом,
	 * нативные чекбоксы, выбор в `SvelteSet`, сортировка по клику на заголовок.
	 * Как голая таблица Vue: ни доступности сверх тегов, ни клавиатуры.
	 */
	const { rows }: { rows: TRec[] } = $props()
	let sort = $state<TSort>(null)
	const selected = new SvelteSet<string | number>()
	const shown = $derived(sorted(rows, sort))
	const all = $derived(rows.length > 0 && selected.size === rows.length)

	function toggleAll() {
		if (all) selected.clear()
		else for (const r of rows) selected.add(r.id)
	}
	function toggle(id: string | number) {
		if (!selected.delete(id)) selected.add(id)
	}
</script>

<table>
	<thead>
		<tr>
			<th><input type="checkbox" checked={all} onchange={toggleAll} /></th>
			{#each COLUMNS as c (c.field)}
				<th data-col={c.field} onclick={() => (sort = nextSort(sort, c.field))}>{c.text}</th>
			{/each}
		</tr>
	</thead>
	<tbody>
		{#each shown as r (r.id)}
			<tr>
				<td>
					<input type="checkbox" checked={selected.has(r.id)} onchange={() => toggle(r.id)} />
				</td>
				{#each COLUMNS as c (c.field)}
					<td>{r[c.field]}</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
