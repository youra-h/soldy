<script lang="ts">
	import { Pagination } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Содержимого у пагинации нет: страницы окна кладёт в коллекцию она сама.
	Язык номеров и имён стрелок — из шапки стенда.
-->
<Pagination {...bind} />
