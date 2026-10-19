import type { IMenuOwner } from '../../../types'
import type { IExtension, IExtensionItems } from '../../../../../base/collection'
import type { IMenuItemExtension } from './item'
import type { IMenuItem } from '../../../item/types'
import type { IMenuSubmenu } from '../../../submenu/types'

/**
 * Контракт расширения меню.
 *
 * Используется как тип `TParent` в `TMenuItemExtension` — через него
 * item-адаптер передаёт меню нажатие своего пункта.
 */
export interface IMenuExtension<
	TItem extends IMenuItem = IMenuItem,
	// `any` в констрейнте намеренно: карта событий инвариантна, и требовать
	// здесь точный набор значило бы запретить наследнику её расширить
	TItemExt extends IMenuItemExtension<TItem, any> = IMenuItemExtension<TItem>,
>
	extends IExtension<TItem, TMenuExtensionEvents>, IExtensionItems<TItem, TItemExt> {
	/**
	 * Открытое подменю этого меню — пункт с подменю, чья панель открыта.
	 * Открыто бывает одно: открывшееся закрывает прежнее. `null` — открытого нет.
	 */
	readonly opened: IMenuSubmenu | null
	/**
	 * Нажатие пункта-действия: закрыть меню целиком и сообщить `choose`.
	 * Возвращает `false`, если пункт недоступен или это не действие.
	 */
	chooseItem(item: TItem): boolean
	/**
	 * Нажатие флажка: переключить отметку, меню не закрывать.
	 * Возвращает, отмечен ли флажок после вызова.
	 */
	toggleItem(item: TItem): boolean
	/**
	 * Открыть подменю пункта — нажатием, наведением или клавишей. Выключенному
	 * и пункту без подменю — отказ. Возвращает, открыто ли подменю после вызова.
	 */
	openItem(item: TItem): boolean
}

/**
 * Опции движка меню: владелец приходит и уходит после сборки. Владелец —
 * меню или пункт с подменю: у каждого уровня меню своя коллекция.
 *
 * `any` — карта событий владельца: шина инвариантна по ней, а коллекция
 * слушает у владельца только то, что требует `IMenuOwner`.
 */
export type TMenuEngineOptions<TOwner extends IMenuOwner<any> = IMenuOwner<any>> = {
	owner: TOwner
}

export type TMenuExtensionEvents = {
	/**
	 * Пользователь нажал пункт-действие — кликом по строке или Enter и
	 * пробелом на ней — в этом меню или в любом его подменю: выбор в подменю
	 * доходит до каждого меню над ним. Приходит, когда меню уже закрыто
	 * целиком: фокус к этому времени вернулся на триггер, и окно, открытое из
	 * обработчика, вернёт его туда же. Флажок события не шлёт: его нажатие —
	 * смена отметки, о ней говорит выбор (`change:selection`, `update:selected`
	 * у флажка)
	 */
	choose: (item: IMenuItem) => void
}
