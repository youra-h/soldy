import type { TRec } from '../data'

/**
 * Строки страницы Svelte — их пишет сценарий, читает `Host`. Руна сырая, как
 * `shallowRef` у страницы Vue: глубокая обернула бы каждую запись в прокси, и
 * за это платил бы каждый участник.
 */
class TPage {
	rows = $state.raw<TRec[] | null>(null)
}

export const page = new TPage()
