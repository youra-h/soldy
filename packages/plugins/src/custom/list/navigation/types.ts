import type { IControl } from '@soldy/core'

/**
 * Куда переехала подсветка.
 *
 * Соседи нужны не для навигации, а потребителям: `TListScrollPlugin` по ним
 * решает, куда прокручивать, не заглядывая в коллекцию.
 */
export type THighlightPayload = {
	item: IControl | null
	prevItem: IControl | null
	nextItem: IControl | null
}

export type TListNavigationPluginEvents = {
	'change:highlight': (payload: THighlightPayload) => void
}

/** Край списка для `highlightEdge`. */
export type TListEdge = 'first' | 'last'
