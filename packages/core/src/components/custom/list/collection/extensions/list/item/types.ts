import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

export type TListItemEventsExtension = TBaseItemEventsExtension & {
	'change:wordWrap': (value: boolean) => void
}

/**
 * Контракт item-адаптера list.
 * Предоставляет геттер wordWrap — резолвится из элемента ?? родительского расширения.
 *
 * Набор событий вшит и наследником не расширяется, поэтому `change:view`
 * у ListBox в тип не попадает и его фасад релеит событие через приведение.
 * Параметризовать `TEvents` пробовали: тип эмиттера инвариантен (middleware
 * принимает карту событий в обе стороны), и требование расходится вверх по
 * `IListExtension` и дальше. Задача отдельная, к фасадам отношения не имеет.
 */
export interface IListItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TListItemEventsExtension
> {
	/** Перенос текста (элемент ?? родительский TList). */
	readonly wordWrap: boolean
}
