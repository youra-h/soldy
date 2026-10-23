import type { IRadioGroup } from '@soldy-ui/core'
import type { RadioGroupCollectionDescriptor, RadioGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type RadioGroupEventProps = EventProps<typeof RadioGroupDescriptor> &
	EventProps<typeof RadioGroupCollectionDescriptor>

export type RadioGroupProps = UseDomProps<
	typeof RadioGroupDescriptor,
	IRadioGroup,
	RadioGroupEventProps
>
