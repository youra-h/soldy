/**
 * Локаль поддерева в контексте Svelte: `LocaleProvider` отдаёт детям свой
 * источник (`setContext`), а сборка компонента (`createSvelteAdapterContext`)
 * берёт ближайший (`getContext`).
 *
 * Ключ — символ модуля, наружу он не выходит: читают и пишут контекст только
 * эти две функции. Вне провайдера источника нет, и у набора своя английская.
 * Обе зовутся при инициализации компонента — тогда же, когда Svelte разрешает
 * `setContext` и `getContext`.
 */

import { getContext, setContext } from 'svelte'
import { TLocaleSource } from '@soldy-ui/plugins'
import type { ILocaleSource } from '@soldy-ui/plugins'

const LOCALE_KEY = Symbol('soldy:locale')

/** Отдать детям источник локали — из `LocaleProvider`. */
export function provideLocale(source: TLocaleSource): void {
	setContext(LOCALE_KEY, source)
}

/**
 * Источник ближайшего `LocaleProvider` выше по дереву; провайдера нет —
 * `undefined`. Значение контекста проверяется, а не приводится: под ключом
 * лежит то, что положил провайдер, и ничего другого.
 */
export function nearestLocale(): ILocaleSource | undefined {
	const source: unknown = getContext(LOCALE_KEY)

	return source instanceof TLocaleSource ? source : undefined
}
