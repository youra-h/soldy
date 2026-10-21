import type { HTMLAttributes } from 'react'
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
	HTMLAttributes<HTMLElement>,
	MenuCheckboxItemEventProps
>

/**
 * Пропсы флажка. Отметка (`selected`) — выбор коллекции меню: она входит в
 * интерфейс пропсов ядра (`IMenuCheckboxItemProps`), и тип её несёт
 * дескриптор флажка.
 */
export type MenuCheckboxItemProps = UseDomProps<
	typeof MenuCheckboxItemDescriptor,
	IMenuCheckboxItem,
	MenuCheckboxItemEventProps
>
