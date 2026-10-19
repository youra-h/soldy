import type { TAria, TAriaAttributes, TClasses } from '../../../../common'
import type { IMenuCollectionProps } from '../collection/types'
import type { IMenuItem, IMenuItemProps, TMenuItemEvents } from '../item/types'
import type { IMenuOwner } from '../types'

export type TMenuSubmenuEvents = TMenuItemEvents & {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:panelAria — набор атрибутов панели подменю изменился */
	'change:panelAria': (value: TAriaAttributes) => void
	/** change:panelClasses — классы панели подменю изменились */
	'change:panelClasses': (value: string[]) => void
	/**
	 * В подменю выбрали пункт-действие: меню, в котором стоит подменю,
	 * закрывается целиком и сообщает выбор выше (`notifyChoose`)
	 */
	choose: (item: IMenuItem) => void
}

/** Пропсы самого пункта с подменю (без коллекционной части). */
export interface IMenuSubmenuComponentProps extends IMenuItemProps {
	/** Открыта ли панель подменю */
	open?: boolean
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
	extends IMenuSubmenuComponentProps, IMenuCollectionProps<IMenuItemProps, IMenuItem> {}

/**
 * Пункт с подменю (`Menu.Submenu`): строка в меню, у которой своя панель с
 * пунктами — «Поделиться → Ссылка, Почта».
 *
 * Пункт меню, в котором стоит, и владелец своих пунктов: для них он то же,
 * что меню для своих (`IMenuOwner`).
 */
export interface IMenuSubmenu
	extends IMenuItem<IMenuSubmenuProps, TMenuSubmenuEvents>, IMenuOwner<TMenuSubmenuEvents> {
	/** Открыта ли панель подменю */
	open: boolean
	/**
	 * ARIA панели подменю — второй стороны связки «пункт ↔ подменю»: роль
	 * `menu`; `id` и `aria-labelledby` на строку пункта пишет плагин связок
	 */
	readonly panelAria: TAria
	/**
	 * Классы панели: блок панели меню с размером и вариантом подменю — до
	 * телепортированной панели модификаторы пункта не доходят
	 */
	readonly panelClasses: TClasses
}
