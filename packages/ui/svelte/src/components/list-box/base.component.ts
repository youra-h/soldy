import type { IListBox } from '@soldy-ui/core'
import type { ListBoxCollectionDescriptor, ListBoxDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../types'

export type ListBoxEventProps = EventProps<typeof ListBoxDescriptor> &
	EventProps<typeof ListBoxCollectionDescriptor>

/** Атрибуты списка: класс и стиль — корню, остальное — узлу списка с `role="listbox"`. */
export type ListBoxAttributes = TDomAttributes<typeof ListBoxDescriptor, ListBoxEventProps>

export type ListBoxProps = UseDomProps<typeof ListBoxDescriptor, IListBox, ListBoxEventProps>
