import type { Snippet } from 'svelte'
import type { TLocale } from '@soldy-ui/plugins'

/** Пропсы провайдера: локаль поддерева и само поддерево. */
export type TLocaleProviderProps = {
	/** Локаль поддерева: тег для Intl и строки библиотеки (`ruRU`, `extendLocale(...)`) */
	locale: TLocale
	children?: Snippet
}
