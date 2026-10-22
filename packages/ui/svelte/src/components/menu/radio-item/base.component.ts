import type { IMenuRadioItem } from '@soldy-ui/core'
import type { MenuCollectionRadioItemDescriptor, MenuRadioItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События переключателя — свои (ядро и плагины) и фасада: отметка — выбор коллекции меню. */
export type MenuRadioItemEventProps = EventProps<typeof MenuRadioItemDescriptor> &
	EventProps<typeof MenuCollectionRadioItemDescriptor>

/** Атрибуты переключателя: класс и стиль — корню, остальное — строке с `role="menuitemradio"`. */
export type MenuRadioItemAttributes = TDomAttributes<
	typeof MenuRadioItemDescriptor,
	MenuRadioItemEventProps
>

/**
 * Пропсы переключателя. Отметка (`selected`) — выбор коллекции меню, как у
 * флажка; группы среди пропсов нет: её пишет проводка — ближайшая
 * `Menu.RadioGroup` над пунктом.
 */
export type MenuRadioItemProps = UseDomProps<
	typeof MenuRadioItemDescriptor,
	IMenuRadioItem,
	MenuRadioItemEventProps
>
