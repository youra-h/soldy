<script lang="ts">
	import { ProgressSpinner } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Кольцо строчное и своего размера. По умолчанию оно пусто — доля ноль, а бег
	— флаг `indeterminate`. Имени без видимой подписи у него нет, превью даёт
	его пропом.
-->
<ProgressSpinner aria_label="Загрузка" {...bind} />
