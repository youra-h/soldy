<script lang="ts">
	import { LocaleProvider } from '@soldy-ui/svelte'
	import { language, type TLive } from './live.svelte'
	import type { TPreview, TPreviewProps } from './previews'

	type TRootProps = {
		/** Чем рисовать: превью компонента или фикстура сценария. */
		preview: TPreview
		/** Пропсы превью с колбэками событий — их меняет `update` хоста. */
		bind: TLive<TPreviewProps>
	}

	const { preview: Preview, bind }: TRootProps = $props()
</script>

<!--
	Корень хоста Svelte: свой `LocaleProvider` вокруг превью. Контекст
	провайдера оболочки в чужой корень не проходит, и язык шапки корню даёт
	хост — смена доходит до провайдера без перемонтирования.
-->
<LocaleProvider locale={language.current}>
	<Preview {...bind.current} />
</LocaleProvider>
