<script lang="ts" module>
	export const sel = {
		selectAll: 'thead input[type="checkbox"]',
		sort: 'thead th[data-col="name"]',
	}
</script>

<script lang="ts">
	import type { TRec } from '../data'
	import TanstackTable from './TanstackTable.svelte'

	/** TanStack Table v9 с нативными чекбоксами. */
	const { rows }: { rows: TRec[] } = $props()
</script>

<TanstackTable {rows} bits={false} />
