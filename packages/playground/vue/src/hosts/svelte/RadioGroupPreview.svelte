<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { RadioGroup } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'
	import { getParts } from './events'

	const bind: TPreviewProps = $props()
	const parts = getParts()
</script>

<!-- Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox -->
<RadioGroup {...bind}>
	{#each COLLECTION_ITEMS as item (item.value)}
		<RadioGroup.Item value={item.value} {...parts.Item}>{item.text}</RadioGroup.Item>
	{/each}
</RadioGroup>
