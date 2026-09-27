import type { HTMLAttributes } from 'react'
import type { IListBoxItem } from '@soldy-ui/core'
import type { ListBoxCollectionItemDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События элемента — свои (ядро и плагины) и фасада: выбор, порядок, вид и сторона отметки. */
export type ListBoxItemEventProps = EventProps<typeof ListBoxItemDescriptor> &
	EventProps<typeof ListBoxCollectionItemDescriptor>

/** Атрибуты элемента: класс и стиль — корню, остальное — строке. */
export type ListBoxItemAttributes = TDomAttributes<
	typeof ListBoxItemDescriptor,
	HTMLAttributes<HTMLElement>,
	ListBoxItemEventProps
>

/**
 * Пропсы элемента. Членство в коллекции (`selected`) входит в интерфейс
 * пропсов ядра (`IListBoxItemProps`), и тип его несёт дескриптор элемента.
 */
export type ListBoxItemProps = UseDomProps<
	typeof ListBoxItemDescriptor,
	IListBoxItem,
	ListBoxItemEventProps
>
