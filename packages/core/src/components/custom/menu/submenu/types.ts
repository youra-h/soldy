import type { TClasses } from '../../../../common'
import type { IMenuCollectionProps } from '../collection/types'
import type { IMenuItem, IMenuItemProps } from '../item/types'
import type { IMenuPopupItem, IMenuPopupItemProps, TMenuPopupItemEvents } from '../popup-item/types'
import type { IMenuOwner } from '../types'

export type TMenuSubmenuEvents = TMenuPopupItemEvents & {
	/** change:panelClasses — классы панели подменю изменились */
	'change:panelClasses': (value: string[]) => void
	/**
	 * В подменю выбрали пункт-действие: меню, в котором стоит подменю,
	 * закрывается целиком и сообщает выбор выше (`notifyChoose`)
	 */
	choose: (item: IMenuItem) => void
}

/**
 * Полный набор пропсов пункта с подменю: свои и его коллекции (`engine`,
 * `items`, `trackBy`, группы), как у меню.
 *
 * Пункты подменю — его собственная коллекция: разметкой (слот `default`) или
 * данными (`items`). Коллекционные пропсы принимает его фасад меню, а не
 * пункт: так же у меню.
 */
export interface IMenuSubmenuProps
	extends IMenuPopupItemProps, IMenuCollectionProps<IMenuItemProps, IMenuItem> {}

/**
 * Пункт с подменю (`Menu.Submenu`): строка в меню, у которой своя панель с
 * пунктами — «Поделиться → Ссылка, Почта».
 *
 * Пункт со своей панелью в меню, в котором стоит (`IMenuPopupItem`: панель —
 * меню, `panelAria` — роль `menu`, `id` и имя от строки), и владелец своих
 * пунктов: для них он то же, что меню для своих (`IMenuOwner`).
 */
export interface IMenuSubmenu
	extends IMenuPopupItem<IMenuSubmenuProps, TMenuSubmenuEvents>, IMenuOwner<TMenuSubmenuEvents> {
	/** Открыта ли панель подменю */
	open: boolean
	/**
	 * Классы панели: блок панели меню с размером и вариантом подменю — до
	 * телепортированной панели модификаторы пункта не доходят
	 */
	readonly panelClasses: TClasses
}
