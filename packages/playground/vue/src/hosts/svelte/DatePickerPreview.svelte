<script lang="ts">
	import { DatePicker } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Поле и календарь — экземпляры DatePicker, содержимого у него нет. Язык — из
	шапки стенда, как у поля и календаря.
-->
<DatePicker {...bind} />
