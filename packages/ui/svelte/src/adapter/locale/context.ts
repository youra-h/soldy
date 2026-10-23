/** Локаль поддерева в контексте Svelte — ключ модуля, только эти две функции. */

import { getContext, setContext } from 'svelte'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { ILocaleSource } from '@soldy-ui/plugins'

const LOCALE_KEY = Symbol('soldy:locale')

export function provideLocale(source: TLocaleSource): void {
	setContext(LOCALE_KEY, source)
}

/** Источник ближайшего `LocaleProvider`; нет его — `undefined`. */
export function nearestLocale(): ILocaleSource | undefined {
	const source: unknown = getContext(LOCALE_KEY)

	return source instanceof TLocaleSource ? source : undefined
}
