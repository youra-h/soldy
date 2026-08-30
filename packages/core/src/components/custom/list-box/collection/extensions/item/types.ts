import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../base/collection'

export type TListBoxItemEventsExtension = TBaseItemEventsExtension & {
	'change:wordWrap': (value: boolean) => void
	'change:view': (value: string) => void
}

/**
 * Контракт item-адаптера listBox.
 * Предоставляет wordWrap (элемент ?? владелец) и view (владелец).
 */
export interface IListBoxItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TListBoxItemEventsExtension
> {
	/** Перенос текста (элемент ?? родительский TListBox). */
	readonly wordWrap: boolean
	/** Внешний вид элемента (наследуется от TListBox). */
	readonly view: string
}
