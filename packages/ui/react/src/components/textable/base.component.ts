/**
 * Textable — слой text.
 */

import type { ITextable } from '@soldy/core'
import type { TextableDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Textable (core + плагины), выведены из дескриптора автоматически. */
export type TTextableEventProps = ReactEventProps<DescriptorAllEvents<typeof TextableDescriptor>>

export type TextableProps = TReactComponentProps<
	DescriptorProps<typeof TextableDescriptor>,
	ITextable
> &
	TTextableEventProps
