import type { IMenuPopupItem, IMenuPopupItemProps, TMenuPopupItemEvents } from '../popup-item/types'

export type TMenuPopoverItemEvents = TMenuPopupItemEvents & {
	/** change:lazyMount */
	'change:lazyMount': (value: boolean) => void
}

/** Пропсы пункта с панелью: открытость панели и её содержимого. */
export interface IMenuPopoverItemProps extends IMenuPopupItemProps {
	/**
	 * Не монтировать содержимое панели, пока её ни разу не открывали. После
	 * первого открытия содержимое остаётся, закрытие только прячет панель
	 */
	lazyMount?: boolean
}

/**
 * Пункт с панелью (`Menu.PopoverItem`): строка в меню, которая открывает
 * сбоку немодальную панель-диалог с любым содержимым — календарём, полями,
 * палитрой.
 */
export interface IMenuPopoverItem extends IMenuPopupItem<
	IMenuPopoverItemProps,
	TMenuPopoverItemEvents
> {
	/** Не монтировать содержимое панели до первого открытия */
	lazyMount: boolean
	/** Смонтировано ли содержимое панели: без `lazyMount` — всегда */
	readonly contentRendered: boolean
}
