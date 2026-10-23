import { createRenderEffect, untrack, type JSX } from 'solid-js'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { LocaleContext } from './context'

export type TLocaleProviderProps = {
	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`) */
	locale: TLocale
	children?: JSX.Element
}

/**
 * LocaleProvider — локаль поддерева: язык и строки библиотеки компонентам
 * внутри.
 *
 * ```tsx
 * <LocaleProvider locale={current()}>
 * 	<App />
 * </LocaleProvider>
 * ```
 *
 * Источник свой на провайдер (сервер рисует запросы каждый на своём языке) и
 * создаётся с локалью первой отрисовки; смена пропа идёт в тот же источник,
 * компоненты не перемонтируются.
 */
export function LocaleProvider(props: TLocaleProviderProps): JSX.Element {
	const source = new TLocaleSource(untrack(() => props.locale))

	createRenderEffect(() => {
		source.locale = props.locale
	})

	return <LocaleContext.Provider value={source}>{props.children}</LocaleContext.Provider>
}
