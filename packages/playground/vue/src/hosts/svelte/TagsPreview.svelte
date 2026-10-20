<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Tags } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Обёртка — граница ширины, как у Vue: ряд обязан быть ровно по ячейке, иначе
	`overflow` не срабатывает вовсе. Сцена ячейки — флексбокс, и с шириной по
	содержимому ряд держал бы свою ширину шире колонки: теги уходили бы за
	край, а в `scroll` прокручивать было бы нечего. Теги — данными (`items`),
	поверх них пропсы строки.
-->
<div style="width: 100%">
	<Tags items={COLLECTION_ITEMS} {...bind} />
</div>
