<script lang="ts">
	import { Toasts } from '@soldy-ui/svelte'
	import ToastsTrigger from './ToastsTrigger.svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Менеджер оборачивает кнопки, которые показывают тосты, — по кнопке на вид
	сообщения и кнопка ожидания (см. `ToastsTrigger.svelte`). Регион с тостами
	— телепортом у края окна, вне ячейки превью.
-->
<Toasts {...bind}><ToastsTrigger /></Toasts>
