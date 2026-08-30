import type {
	IListItemExtension,
	TListItemEventsExtension,
} from '../../../../list/collection/extensions/item/types'

export type TListBoxItemEventsExtension = TListItemEventsExtension & {
	'change:view': (value: string) => void
}

/**
 * Контракт item-адаптера listBox.
 * Наследует IListItemExtension (wordWrap) и добавляет view (владелец).
 */
export interface IListBoxItemExtension<
	TItem extends object = any,
> extends IListItemExtension<TItem> {
	/** Внешний вид элемента (наследуется от TListBox). */
	readonly view: string
}
