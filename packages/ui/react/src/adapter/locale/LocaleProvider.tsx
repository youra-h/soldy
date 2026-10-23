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
 * LocaleProvider — язык и строки библиотеки компонентам внутри; смена пропа
 * переписывает их на лету, без перемонтирования. Без провайдера — английский.
 * AGENTS.md (React), «Локаль и тосты».
 *
 * ```tsx
 * <LocaleProvider locale={current}>
 * 	<App />
 * </LocaleProvider>
 * ```
 */
export function LocaleProvider({ locale, children }: TLocaleProviderProps): ReactNode {
	const [source] = useState(() => new TLocaleSource(locale))

	useLayoutEffect(() => {
		source.locale = locale
	}, [source, locale])

	return <LocaleContext value={source}>{children}</LocaleContext>
}
