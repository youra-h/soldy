import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TListIndicator } from '../../../../../list'

export type TListBoxItemEventsExtension = TBaseItemEventsExtension & {
	'change:indicator': (value: TListIndicator) => void
}

/**
 * Контракт item-адаптера списка.
 *
 * `indicator` берётся у владельца целиком. Вид (`view`) — свойство самого
 * элемента: его пишет родительское расширение, как `size` и `variant`. Своё
 * значение элемента поверх списочного (`contentFit`) адаптер не разрешает —
 * это делает родительское расширение, записывая элементу `data-content-fit`.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие. Про то,
 * почему без этого наследник перестаёт подходить под контракт родителя, —
 * в `IItemExtension`.
 */
export interface IListBoxItemExtension<
	TItem extends object = any,
	TEvents extends TListBoxItemEventsExtension = TListBoxItemEventsExtension,
> extends IItemExtension<TItem, TEvents> {
	/** Где стоит отметка выбранного — значение списка целиком. */
	readonly indicator: TListIndicator
	/** Выбор пользователя: переключить выбор, если элемент доступен. */
	choose(): void
}
