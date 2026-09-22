import type { IControl } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

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

export type TListNavigationPluginEvents = TPluginEvents & {
	'change:highlight': (payload: THighlightPayload) => void
}

/** Край списка для `highlightEdge`. */
export type TListEdge = 'first' | 'last'
