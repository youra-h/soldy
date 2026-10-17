import type { IMenu } from '../../../types'
import type { IExtension, IExtensionItems } from '../../../../../base/collection'
import type { IMenuItemExtension } from './item'
import type { IMenuItem } from '../../../item/types'

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
	 * Нажатие пункта-действия: закрыть меню и сообщить `choose`.
	 * Возвращает `false`, если пункт недоступен.
	 */
	chooseItem(item: TItem): boolean
	/**
	 * Нажатие флажка: переключить отметку, меню не закрывать.
	 * Возвращает, отмечен ли флажок после вызова.
	 */
	toggleItem(item: TItem): boolean
}

/** Опции движка меню: владелец приходит и уходит после сборки. */
export type TMenuEngineOptions<TOwner extends IMenu = IMenu> = {
	owner: TOwner
}

export type TMenuExtensionEvents = {
	/**
	 * Пользователь нажал пункт-действие — кликом по строке или Enter и
	 * пробелом на ней. Приходит, когда меню уже закрыто: фокус к этому
	 * времени вернулся на триггер, и окно, открытое из обработчика, вернёт его
	 * туда же. Флажок события не шлёт: его нажатие — смена отметки, о ней
	 * говорит выбор (`change:selection`, `update:selected` у флажка)
	 */
	choose: (item: IMenuItem) => void
}
