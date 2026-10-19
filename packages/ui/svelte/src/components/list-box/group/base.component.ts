import type { IItemGroup } from '@soldy-ui/core'
import type { ListBoxGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События группы — свои (ядро и плагин имени): подпись и её набор. */
export type ListBoxGroupEventProps = EventProps<typeof ListBoxGroupDescriptor>

/** Пропсы группы: подпись — проп `label`, элементы — содержимое. */
export type ListBoxGroupProps = UseDomProps<
	typeof ListBoxGroupDescriptor,
	IItemGroup,
	ListBoxGroupEventProps
>
