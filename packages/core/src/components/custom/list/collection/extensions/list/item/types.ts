import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TListItemEventsExtension = TBaseItemEventsExtension & {
	'change:wordWrap': (value: boolean) => void
}

/**
 * Контракт item-адаптера list.
 * Предоставляет геттер wordWrap — резолвится из элемента ?? родительского расширения.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие: у
 * ListBox это `change:view`. Про то, почему без этого наследник перестаёт
 * подходить под контракт родителя, — в `IItemExtension`.
 */
export interface IListItemExtension<
	TItem extends object = any,
	TEvents extends TListItemEventsExtension = TListItemEventsExtension,
> extends IItemExtension<TItem, TEvents> {
	/** Перенос текста (элемент ?? родительский TList). */
	readonly wordWrap: boolean
}
