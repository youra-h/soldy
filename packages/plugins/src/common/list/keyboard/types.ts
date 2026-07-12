import type { IListItem } from '@soldy/core'

export type THighlightPayload = {
	item: IListItem | null
	prevItem: IListItem | null
	nextItem: IListItem | null
}

export type TListKeyboardPluginEvents = {
	changeHighlighted: (payload: THighlightPayload) => void
}
