import type { TClasses, TComponentVariant, TValuePayload } from '../../../../common'
import type { IMenuCollectionProps, IMenuItemSource } from '../collection/types'
import type { IMenuItem } from '../item/types'
import type { IMenuPopupItem, IMenuPopupItemProps, TMenuPopupItemEvents } from '../popup-item/types'
import type { IMenuOwner } from '../types'

export type TMenuSubmenuEvents = TMenuPopupItemEvents & {
	/** change:panelClasses — классы панели подменю изменились */
	'change:panelClasses': (value: string[]) => void
	/**
	 * change:panelVariant — вариант панели подменю сменился: свой вариант или,
	 * без него, вариант меню над ним
	 */
	'change:panelVariant': (payload: TValuePayload<TComponentVariant | undefined>) => void
	/** change:groupSeparators */
	'change:groupSeparators': (value: boolean) => void
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
 * данными (`items`), и пункт данными с вложенным `items` — подменю следующего
 * уровня. Коллекционные пропсы принимает его фасад меню, а не пункт: так же у
 * меню.
 */
export interface IMenuSubmenuProps
	extends IMenuPopupItemProps, IMenuCollectionProps<IMenuItemSource, IMenuItem> {
	/**
	 * Рисовать ли разделитель между соседними секциями группировки пунктов
	 * подменю из данных, как у меню. Ручной `Menu.Separator` разметки свойство
	 * не трогает. По умолчанию — да
	 */
	groupSeparators?: boolean
}

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
	/** Рисовать ли разделитель между соседними секциями группировки пунктов */
	groupSeparators: boolean
	/**
	 * Вариант меню, в котором стоит подменю, — вариант панели того меню. Не
	 * проп: пишет коллекция того меню, как размер. Панель подменю красится им,
	 * пока у подменю нет своего варианта (`panelVariant`)
	 */
	menuVariant: TComponentVariant | undefined
	/**
	 * Классы панели: блок панели меню с размером подменю и вариантом панели
	 * (`panelVariant`) — до телепортированной панели модификаторы пункта не
	 * доходят
	 */
	readonly panelClasses: TClasses
}
