import type { HTMLAttributes } from 'react'
import type { IListBoxItem } from '@soldy-ui/core'
import type { ListBoxCollectionItemDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

export type ListBoxItemEventProps = EventProps<typeof ListBoxItemDescriptor> &
	EventProps<typeof ListBoxCollectionItemDescriptor>

/** Атрибуты элемента: класс и стиль — корню, остальное — строке. */
export type ListBoxItemAttributes = TDomAttributes<
	typeof ListBoxItemDescriptor,
	HTMLAttributes<HTMLElement>,
	ListBoxItemEventProps
>

export type ListBoxItemProps = UseDomProps<
	typeof ListBoxItemDescriptor,
	IListBoxItem,
	ListBoxItemEventProps
>
