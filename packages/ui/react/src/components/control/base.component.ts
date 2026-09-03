/**
 * Control — слой disabled/focused.
 */

import type { IControl } from '@soldy/core'
import type { ControlDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Control (core + плагины), выведены из дескриптора автоматически. */
export type TControlEventProps = ReactEventProps<DescriptorAllEvents<typeof ControlDescriptor>>

export type ControlProps = TReactComponentProps<
	DescriptorProps<typeof ControlDescriptor>,
	IControl
> &
	TControlEventProps
