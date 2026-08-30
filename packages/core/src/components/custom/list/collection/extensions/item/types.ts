import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../base/collection'

export type TListItemEventsExtension = TBaseItemEventsExtension & {
	'change:wordWrap': (value: boolean) => void
}

/**
 * Контракт item-адаптера list.
 * Предоставляет геттер wordWrap — резолвится из элемента ?? родительского расширения.
 */
export interface IListItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TListItemEventsExtension
> {
	/** Перенос текста (элемент ?? родительский TList). */
	readonly wordWrap: boolean
}
