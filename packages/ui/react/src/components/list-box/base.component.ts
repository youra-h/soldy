import type { HTMLAttributes } from 'react'
import type { IListBox } from '@soldy-ui/core'
import type { ListBoxCollectionDescriptor, ListBoxDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../types'

/** Колбэки обоих контекстов списка — свой и фасада коллекции — пропсы одного компонента. */
export type ListBoxEventProps = EventProps<typeof ListBoxDescriptor> &
	EventProps<typeof ListBoxCollectionDescriptor>

/** Атрибуты списка: класс и стиль — корню, остальное — узлу списка с `role="listbox"`. */
export type ListBoxAttributes = TDomAttributes<
	typeof ListBoxDescriptor,
	HTMLAttributes<HTMLElement>,
	ListBoxEventProps
>

export type ListBoxProps = UseDomProps<typeof ListBoxDescriptor, IListBox, ListBoxEventProps>
