import { createSignal, type Accessor, type JSX } from 'solid-js'
import { enUS, type TLocale } from '@soldy-ui/plugins'
import { LocaleProvider } from '@soldy-ui/solid'
import type { TPreview, TPreviewProps } from './previews'

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
}

/**
 * Корень хоста Solid: свой `LocaleProvider` вокруг превью. Контекст
 * провайдера оболочки в чужой корень не проходит, и язык шапки корню даёт
 * хост.
 */
export function Root(props: TRootProps): JSX.Element {
	return <LocaleProvider locale={language()}>{props.preview(props.bind)}</LocaleProvider>
}
