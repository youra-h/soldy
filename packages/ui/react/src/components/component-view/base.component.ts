/**
 * ComponentView — слой tag/classes/ready + рендер динамического тега.
 */

import type { HTMLAttributes } from 'react'
import type { IComponentView } from '@soldy/core'
import type { ComponentViewDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя ComponentView (core + плагины), выведены из дескриптора автоматически. */
export type TComponentViewEventProps = ReactEventProps<DescriptorAllEvents<typeof ComponentViewDescriptor>>

export type ComponentViewProps = TReactComponentProps<
	DescriptorProps<typeof ComponentViewDescriptor>,
	IComponentView
> &
	TComponentViewEventProps &
	HTMLAttributes<HTMLElement>
