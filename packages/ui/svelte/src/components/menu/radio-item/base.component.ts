import type { IMenuRadioItem } from '@soldy-ui/core'
import type { MenuCollectionRadioItemDescriptor, MenuRadioItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

export type MenuRadioItemEventProps = EventProps<typeof MenuRadioItemDescriptor> &
	EventProps<typeof MenuCollectionRadioItemDescriptor>

/** Атрибуты переключателя: класс и стиль — корню, остальное — строке с `role="menuitemradio"`. */
export type MenuRadioItemAttributes = TDomAttributes<
	typeof MenuRadioItemDescriptor,
	MenuRadioItemEventProps
>

/** Группу пишет ближайшая `Menu.RadioGroup` над пунктом. */
export type MenuRadioItemProps = UseDomProps<
	typeof MenuRadioItemDescriptor,
	IMenuRadioItem,
	MenuRadioItemEventProps
>
