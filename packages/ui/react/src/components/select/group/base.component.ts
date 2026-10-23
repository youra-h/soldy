import type { IItemGroup } from '@soldy-ui/core'
import type { SelectGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type SelectGroupEventProps = EventProps<typeof SelectGroupDescriptor>

/** Пропсы группы: подпись — проп `label`, опции — дети. */
export type SelectGroupProps = UseDomProps<
	typeof SelectGroupDescriptor,
	IItemGroup,
	SelectGroupEventProps
>
