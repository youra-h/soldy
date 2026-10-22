<script lang="ts">
	import { Calendar } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Содержимого у календаря нет: дни кладёт в коллекцию вид по месяцам сеток.
	Языка у превью нет: это локаль провайдера вокруг корня хоста — выбор языка
	в шапке (`setLocale` хоста), как у Vue.
-->
<Calendar {...bind} />
