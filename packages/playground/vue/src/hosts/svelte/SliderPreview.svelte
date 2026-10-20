<script lang="ts">
	import { Label, Slider } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Имени у ползунка нет, как у чекбокса: видимое даёт подпись Label, над
	ползунком. Горизонтальный тянется на её ширину, вертикальный — своей
	высоты.
-->
<Label text="Громкость" position="top">
	<Slider {...bind} />
</Label>
