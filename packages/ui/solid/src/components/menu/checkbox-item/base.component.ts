import type { IMenuCheckboxItem } from '@soldy-ui/core'
import type {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
} from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События флажка — свои (ядро и плагины) и фасада: отметка — выбор коллекции меню. */
export type MenuCheckboxItemEventProps = EventProps<typeof MenuCheckboxItemDescriptor> &
	EventProps<typeof MenuCollectionCheckboxItemDescriptor>

/** Атрибуты флажка: класс и стиль — корню, остальное — строке с `role="menuitemcheckbox"`. */
export type MenuCheckboxItemAttributes = TDomAttributes<
	typeof MenuCheckboxItemDescriptor,
	MenuCheckboxItemEventProps
>

/** Пропсы флажка; отметка (`selected`) — выбор коллекции меню. */
export type MenuCheckboxItemProps = UseDomProps<
	typeof MenuCheckboxItemDescriptor,
	IMenuCheckboxItem,
	MenuCheckboxItemEventProps
>
