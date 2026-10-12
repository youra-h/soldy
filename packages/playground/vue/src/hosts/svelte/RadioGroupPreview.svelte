<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { RadioGroup } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!-- Подпись — содержимым: текста у радио нет, оно голый контрол, как CheckBox -->
<RadioGroup {...bind}>
	{#each COLLECTION_ITEMS as item (item.value)}
		<RadioGroup.Item value={item.value}>{item.text}</RadioGroup.Item>
	{/each}
</RadioGroup>
