/**
 * ComponentView — слой tag/classes/ready + рендер динамического тега.
 */

import type { HTMLAttributes } from 'react'
import type { IComponentView, IComponentViewProps } from '@soldy/core'
import type { TComponentEventProps } from '../component'
import type { TReactComponentProps } from '../../types'

/** События слоя ComponentView. */
export type TComponentViewEventProps = TComponentEventProps & {
	onReady?: (value: boolean) => void
	onChangeTag?: (value: string | object) => void
	onChangeClasses?: (value: string[]) => void
	onElementReady?: (el: HTMLElement) => void
	onElementRemoved?: () => void
}

export type ComponentViewProps = TReactComponentProps<IComponentViewProps, IComponentView> &
	TComponentViewEventProps &
	HTMLAttributes<HTMLElement>
