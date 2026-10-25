<script lang="ts">
	import type { Component } from 'svelte'
	import type { TRec } from '../data'
	import { page } from './page.svelte'

	/** Корень страницы Svelte: таблица участника над строками страницы. */
	const { Bench }: { Bench: Component<{ rows: TRec[] }> } = $props()
</script>

{#if page.rows}
	<Bench rows={page.rows} />
{/if}
