import { createSignal, type Accessor, type JSX } from 'solid-js'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/solid'
import type { TPreview, TPreviewProps } from './previews'
import type { TParts } from './events'

/**
 * Язык шапки — один на все корни хоста: сигнал, который читает провайдер
 * каждого корня. Смена — новая локаль провайдера, и он пишет её в свой
 * источник: компоненты не перемонтируются.
 */
export const [language, setLanguage] = createSignal<TLocale>(enUS)

export type TRootProps = {
	/** Чем рисовать: превью компонента или фикстура сценария. */
	preview: TPreview
	/** Пропсы превью с колбэками событий — сигнал, его меняет `update` хоста. */
	bind: Accessor<TPreviewProps>
	/** Listeners of the preview's parts (`TPreview`). */
	parts: TParts
	/** Сколько копий превью рядом (`TPreviewMount.count`). */
	count: number
}

/**
 * Корень хоста Solid: свой `LocaleProvider` вокруг превью. Контекст
 * провайдера оболочки в чужой корень не проходит, и язык шапки корню даёт
 * хост. Копии превью строятся один раз, как тело компонента: число копий
 * корень не меняет.
 */
export function Root(props: TRootProps): JSX.Element {
	return (
		<LocaleProvider locale={language()}>
			{Array.from({ length: props.count }, () => props.preview(props.bind, props.parts))}
		</LocaleProvider>
	)
}
