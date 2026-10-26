import type { TAria, TAriaAttributes } from '../../../../common'
import type { IMenuItem, IMenuItemProps, TMenuItemEvents } from '../item/types'

/**
 * Что за панель у пункта: меню своих пунктов (`Menu.Submenu`) или диалог с
 * любым содержимым (`Menu.PopoverItem`). Это и роль панели, и `aria-haspopup`
 * строки: ARIA называет их одним словом.
 */
export type TMenuPopup = 'menu' | 'dialog'

export type TMenuPopupItemEvents = TMenuItemEvents & {
	/** change:open */
	'change:open': (value: boolean) => void
	/** change:panelAria — набор атрибутов панели пункта изменился */
	'change:panelAria': (value: TAriaAttributes) => void
}

/** Пропсы пункта со своей панелью. */
export interface IMenuPopupItemProps extends IMenuItemProps {
	/** Открыта ли панель пункта */
	open?: boolean
}

/**
 * Пункт со своей панелью сбоку — пункт с подменю (`Menu.Submenu`) или пункт с
 * панелью (`Menu.PopoverItem`). Строка не выполняет действие, а открывает
 * панель; открыта у меню одна такая панель, и закрытое меню закрывает её.
 *
 * Карта событий по умолчанию стёрта (`any`), как у пункта: коллекция держит
 * пункты обоих видов, а у подменю карта шире, и шина инвариантна по ней.
 */
export interface IMenuPopupItem<
	TProps extends IMenuPopupItemProps = IMenuPopupItemProps,
	TEvents extends TMenuPopupItemEvents = any,
> extends IMenuItem<TProps, TEvents> {
	/** Открыта ли панель пункта */
	open: boolean
	/**
	 * ARIA панели — второй стороны связки «пункт ↔ панель»: роль панели;
	 * `id` и `aria-labelledby` на строку пункта пишет плагин связок
	 */
	readonly panelAria: TAria
	/**
	 * Whether the panel's content is mounted: the submenu's items from the
	 * first opening on; the content of an item with a panel — always, and with
	 * `lazyMount` from the first opening on
	 */
	readonly contentRendered: boolean
}
