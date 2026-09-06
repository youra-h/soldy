<script lang="ts">
	import type { Snippet } from 'svelte'

	type Props = {
		title: string
		properties?: Snippet
		propsDemo?: Snippet
		instanceDemo?: Snippet
		slotsDemo?: Snippet
	}

	const { title, properties, propsDemo, instanceDemo, slotsDemo }: Props = $props()
</script>

<div class="pg-layout">
	<div class="pg-layout__header">
		<h1 class="pg-layout__title">{title}</h1>
	</div>

	<div class="pg-layout__section pg-layout__section--properties">
		<h2 class="pg-layout__section-title">Properties</h2>
		{@render properties?.()}
	</div>

	<div class="pg-layout__demo-grid">
		{#if propsDemo}
			<div class="pg-layout__demo-column">
				<h3 class="pg-layout__demo-title">Props Demo</h3>
				<div class="pg-layout__demo-content">{@render propsDemo()}</div>
			</div>
		{/if}

		{#if instanceDemo}
			<div class="pg-layout__demo-column">
				<h3 class="pg-layout__demo-title">Instance Demo</h3>
				<div class="pg-layout__demo-content">{@render instanceDemo()}</div>
			</div>
		{/if}

		{#if slotsDemo}
			<div class="pg-layout__demo-column">
				<h3 class="pg-layout__demo-title">Slots Demo</h3>
				<div class="pg-layout__demo-content">{@render slotsDemo()}</div>
			</div>
		{/if}
	</div>
</div>
