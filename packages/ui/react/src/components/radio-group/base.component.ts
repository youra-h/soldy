import type { IRadioGroup } from '@soldy-ui/core'
import type { RadioGroupCollectionDescriptor, RadioGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События RadioGroup — свои и фасада коллекции: колбэки обоих контекстов — пропсы компонента. */
export type RadioGroupEventProps = EventProps<typeof RadioGroupDescriptor> &
	EventProps<typeof RadioGroupCollectionDescriptor>

/** Пропсы RadioGroup; коллекционные входы (`engine`, `items`) несёт `IRadioGroupProps`. */
export type RadioGroupProps = UseDomProps<
	typeof RadioGroupDescriptor,
	IRadioGroup,
	RadioGroupEventProps
>
