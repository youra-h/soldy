import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TListBoxView } from '../../../../types'

export type TListBoxItemEventsExtension = TBaseItemEventsExtension & {
	'change:view': (value: TListBoxView) => void
}

/**
 * Контракт item-адаптера списка.
 *
 * `wordWrap` резолвится как «значение элемента поверх значения списка», `view`
 * берётся у владельца целиком.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие. Про то,
 * почему без этого наследник перестаёт подходить под контракт родителя, —
 * в `IItemExtension`.
 */
export interface IListBoxItemExtension<
	TItem extends object = any,
	TEvents extends TListBoxItemEventsExtension = TListBoxItemEventsExtension,
> extends IItemExtension<TItem, TEvents> {
	/** Внешний вид элемента — со списка. */
	readonly view: TListBoxView
}
