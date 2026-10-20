<script lang="ts">
	import { Label, Rating } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!-- Имени у оценки нет, как у ползунка: видимое даёт подпись Label над звёздами. -->
<Label text="Оценка" position="top">
	<Rating {...bind} />
</Label>
