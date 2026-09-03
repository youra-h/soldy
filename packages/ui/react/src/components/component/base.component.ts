/**
 * Component — headless-слой TComponent (rendered/visible/events).
 *
 * В отличие от Vue здесь нет «extends»-цепочки: базовые слои экспортируются
 * как типы props и хуки, на которых строятся конкретные компоненты.
 */

import type { IComponent } from '@soldy/core'
import type { ComponentDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Component (колбэки-пропсы React), выведены из ComponentDescriptor. */
export type TComponentEventProps = ReactEventProps<DescriptorAllEvents<typeof ComponentDescriptor>>

export type ComponentProps = TReactComponentProps<
	DescriptorProps<typeof ComponentDescriptor>,
	IComponent
> &
	TComponentEventProps
