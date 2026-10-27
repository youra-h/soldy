<script lang="ts">
	import { LocaleProvider } from '@soldy-ui/svelte'
	import { language, type TLive } from './live.svelte'
	import type { TPreview, TPreviewProps } from './previews'
	import { setParts, type TParts } from './events'

	type TRootProps = {
		/** Чем рисовать: превью компонента или фикстура сценария. */
		preview: TPreview
		/** Пропсы превью с колбэками событий — их меняет `update` хоста. */
		bind: TLive<TPreviewProps>
		/** Listeners of the preview's parts: the previews take them from the context. */
		parts: TParts
		/** Сколько копий превью рядом (`TPreviewMount.count`). */
		count: number
	}

	const { preview: Preview, bind, parts, count }: TRootProps = $props()

	// A mount's parts do not change: the context takes them once
	// svelte-ignore state_referenced_locally
	setParts(parts)
</script>

<!--
	Корень хоста Svelte: свой `LocaleProvider` вокруг превью. Контекст
	провайдера оболочки в чужой корень не проходит, и язык шапки корню даёт
	хост — смена доходит до провайдера без перемонтирования. Копии превью —
	рядом, число копий корень не меняет.
-->
<LocaleProvider locale={language.current}>
	{#each { length: count }, index (index)}
		<Preview {...bind.current} />
	{/each}
</LocaleProvider>
