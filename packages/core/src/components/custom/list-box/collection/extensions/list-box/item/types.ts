import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TListBoxView } from '../../../../types'
import type { TListIndicator } from '../../../../../list'

export type TListBoxItemEventsExtension = TBaseItemEventsExtension & {
	'change:view': (value: TListBoxView) => void
	'change:indicator': (value: TListIndicator) => void
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
	/** Где стоит отметка выбранного — значение списка целиком. */
	readonly indicator: TListIndicator
}
