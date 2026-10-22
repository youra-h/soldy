import type { IMenuPopoverItem } from '@soldy-ui/core'
import type { MenuCollectionItemDescriptor, MenuPopoverItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События пункта с панелью — свои (ядро и плагины) и фасада: вход в коллекцию меню. */
export type MenuPopoverItemEventProps = EventProps<typeof MenuPopoverItemDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor>

/** Атрибуты пункта с панелью: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuPopoverItemAttributes = TDomAttributes<
	typeof MenuPopoverItemDescriptor,
	MenuPopoverItemEventProps
>

/** Пропсы пункта с панелью: открытость панели и `lazyMount` её содержимого, содержимое — `children`. */
export type MenuPopoverItemProps = UseDomProps<
	typeof MenuPopoverItemDescriptor,
	IMenuPopoverItem,
	MenuPopoverItemEventProps
>
