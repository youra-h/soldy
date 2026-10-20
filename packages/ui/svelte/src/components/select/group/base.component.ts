import type { IItemGroup } from '@soldy-ui/core'
import type { SelectGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События группы — свои (ядро и плагин имени): подпись и её набор. */
export type SelectGroupEventProps = EventProps<typeof SelectGroupDescriptor>

/** Пропсы группы: подпись — проп `label`, опции — содержимое. */
export type SelectGroupProps = UseDomProps<
	typeof SelectGroupDescriptor,
	IItemGroup,
	SelectGroupEventProps
>
