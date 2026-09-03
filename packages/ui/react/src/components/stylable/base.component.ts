/**
 * Stylable — слой size/variant.
 */

import type { IStylable } from '@soldy/core'
import type { StylableDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Stylable (core + плагины), выведены из дескриптора автоматически. */
export type TStylableEventProps = ReactEventProps<DescriptorAllEvents<typeof StylableDescriptor>>

export type StylableProps = TReactComponentProps<
	DescriptorProps<typeof StylableDescriptor>,
	IStylable
> &
	TStylableEventProps
