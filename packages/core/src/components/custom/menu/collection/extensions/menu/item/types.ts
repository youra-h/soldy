import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'

/** События item-адаптера меню: своих сверх базы нет. */
export type TMenuItemEventsExtension = TBaseItemEventsExtension

/**
 * Контракт item-адаптера меню: нажатие пункта, которое решает меню.
 *
 * `TEvents` параметризован, чтобы наследник мог добавить своё событие. Про то,
 * почему без этого наследник перестаёт подходить под контракт родителя, —
 * в `IItemExtension`.
 */
export interface IMenuItemExtension<
	TItem extends object = any,
	TEvents extends TMenuItemEventsExtension = TMenuItemEventsExtension,
> extends IItemExtension<TItem, TEvents> {
	/** Нажатие пункта-действия: выполнить и закрыть меню, если пункт доступен. */
	choose(): void
	/** Нажатие флажка: переключить отметку, если флажок доступен. Меню остаётся открытым. */
	toggle(): void
	/**
	 * Нажатие переключателя: отметить его, если он доступен, — с остальных
	 * переключателей его группы отметка снимается. Меню остаётся открытым
	 */
	check(): void
	/**
	 * Нажатие пункта со своей панелью — подменю или пункта с панелью: открыть
	 * панель, если пункт доступен. Открывает, а не переключает: панель,
	 * открытая наведением, клик не закроет.
	 */
	open(): void
}
