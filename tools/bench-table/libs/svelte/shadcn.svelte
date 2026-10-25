<script lang="ts" module>
	export const sel = {
		selectAll: 'thead button[role="checkbox"]',
		sort: 'thead th[data-col="name"]',
	}
</script>

<script lang="ts">
	import type { TRec } from '../data'
	import TanstackTable from './TanstackTable.svelte'

	/**
	 * Data Table shadcn-svelte — TanStack Table v9 и `Checkbox` Bits UI
	 * (`Checkbox` у shadcn-svelte — обёртка `Checkbox.Root` с классами Tailwind;
	 * `Table` — теги с классами). Классы и Tailwind не берём: стенд мерит работу,
	 * а не CSS.
	 */
	const { rows }: { rows: TRec[] } = $props()
</script>

<TanstackTable {rows} bits={true} />
