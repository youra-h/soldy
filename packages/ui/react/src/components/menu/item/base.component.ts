import type { HTMLAttributes } from 'react'
import type { IMenuItem } from '@soldy-ui/core'
import type { MenuCollectionItemDescriptor, MenuItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События пункта — свои (ядро и плагины) и фасада: вход в коллекцию меню. */
export type MenuItemEventProps = EventProps<typeof MenuItemDescriptor> &
	EventProps<typeof MenuCollectionItemDescriptor>

/** Атрибуты пункта: класс и стиль — корню, остальное — строке с `role="menuitem"`. */
export type MenuItemAttributes = TDomAttributes<
	typeof MenuItemDescriptor,
	HTMLAttributes<HTMLElement>,
	MenuItemEventProps
>

/**
 * Пропсы пункта-действия. Размера среди них нет: его диктует меню. Вариант —
 * свой: «опасный» пункт красится своим цветом.
 */
export type MenuItemProps = UseDomProps<typeof MenuItemDescriptor, IMenuItem, MenuItemEventProps>
