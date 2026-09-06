<script lang="ts">
	import type { Snippet } from 'svelte'

	const { label, children }: { label: string; children: Snippet } = $props()
</script>

<div class="property-field">
	<!-- span, а не label: контрол приходит сниппетом, связать по `for` нечем -->
	<span class="property-field__label">{label}:</span>
	<div class="property-field__control">{@render children()}</div>
</div>
