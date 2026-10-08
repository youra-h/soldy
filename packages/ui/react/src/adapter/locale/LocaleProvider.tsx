import { useLayoutEffect, useState, type ReactNode } from 'react'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { LocaleContext } from './context'

export type TLocaleProviderProps = {
	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`) */
	locale: TLocale
	children?: ReactNode
}

/**
 * LocaleProvider — локаль поддерева: язык и строки библиотеки компонентам
 * внутри.
 *
 * ```tsx
 * <LocaleProvider locale={current}>
 * 	<App />
 * </LocaleProvider>
 * ```
 *
 * Источник локали (`TLocaleSource`) у провайдера свой: он создаётся с
 * провайдером и уходит детям контекстом, а сборка каждого компонента отдаёт
 * его набору плагинов. Сменили проп — провайдер пишет новую локаль в
 * источник, и плагины языка и имён переписывают компонентам тег и имена на
 * лету, без перемонтирования: источник тот же, и пересобирать контексты
 * незачем. Источник один на провайдер, а не на процесс: сервер рисует
 * параллельные запросы каждый на своём языке, а вложенный провайдер даёт
 * поддереву свой. Без провайдера компоненты — на английском.
 *
 * Источник — в `useState`, а не в `useRef`: инициализатор под StrictMode
 * зовётся дважды, но у источника нет ни подписок, ни ресурсов, и лишний
 * просто уходит сборщику мусора. Новую локаль провайдер пишет в эффекте, а не
 * на рендере: запись будит подписчиков других компонентов, а обновлять их
 * посреди чужого рендера React не даёт. Эффект — layout: имена и подписи
 * меняются до отрисовки кадра.
 *
 * Провайдер — механизм фреймворка (контекст, состояние, эффект), поэтому он
 * в адаптерном слое, а не среди компонентов.
 */
export function LocaleProvider({ locale, children }: TLocaleProviderProps): ReactNode {
	const [source] = useState(() => new TLocaleSource(locale))

	useLayoutEffect(() => {
		source.locale = locale
	}, [source, locale])

	return <LocaleContext value={source}>{children}</LocaleContext>
}
