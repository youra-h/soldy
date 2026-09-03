/**
 * ComponentView — слой tag/classes/ready + рендер динамического тега.
 */

import type { HTMLAttributes } from 'react'
import type { IComponentView, IComponentViewProps, TComponentViewEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps, TElementEventProps } from '../../adapter'

/** События слоя ComponentView (core-события + element-плагин), выведены автоматически. */
export type TComponentViewEventProps = ReactEventProps<TComponentViewEvents> & TElementEventProps

export type ComponentViewProps = TReactComponentProps<IComponentViewProps, IComponentView> &
	TComponentViewEventProps &
	HTMLAttributes<HTMLElement>
