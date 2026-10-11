<script lang="ts">
	import { Button } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Метки во всех трёх слотах: сценарий ищет их по `data-probe` и сверяет
	порядок, а в `default` (у Svelte — `children`) печатает то, что пришло в
	scope.
-->
<Button {...bind}>
	{#snippet leading()}<span data-probe="leading">L</span>{/snippet}
	{#snippet children({ text })}<span data-probe="default">{text}</span>{/snippet}
	{#snippet trailing()}<span data-probe="trailing">T</span>{/snippet}
</Button>
