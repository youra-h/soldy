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
 * Источник локали (`TLocaleSource`) у провайдера свой: он создаётся с
 * провайдером и уходит детям контекстом, а сборка каждого компонента отдаёт
 * его набору плагинов. Источник один на провайдер, а не на процесс: сервер
 * рисует параллельные запросы каждый на своём языке, а вложенный провайдер
 * даёт поддереву свой. Без провайдера компоненты — на английском.
 *
 * Тело провайдера выполняется один раз, и источник создаётся с локалью первой
 * отрисовки: имена нужны уже в ней, в том числе на сервере, где эффектов нет.
 * `untrack` — только чтобы чтение пропа было явно разовым. Смена пропа — в тот
 * же источник: плагины языка и имён переписывают компонентам тег и имена, а
 * компоненты не перемонтируются. Эффект — отрисовки (`createRenderEffect`):
 * имена меняются тем же проходом, что и разметка.
 *
 * Провайдер — механизм фреймворка (контекст, эффект), поэтому он в адаптерном
 * слое, а не среди компонентов. Своей разметки у него нет: рисует он только
 * содержимое.
 */
export function LocaleProvider(props: TLocaleProviderProps): JSX.Element {
	const source = new TLocaleSource(untrack(() => props.locale))

	createRenderEffect(() => {
		source.locale = props.locale
	})

	return <LocaleContext.Provider value={source}>{props.children}</LocaleContext.Provider>
}
