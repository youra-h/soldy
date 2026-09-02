/**
 * Button — конкретный компонент на базе TButton.
 */

import type { HTMLAttributes } from 'react'
import { ButtonDescriptor } from '@soldy/setup'
import type { IButton, IButtonProps, TButtonView } from '@soldy/core'
import { useComponent } from '../../adapter'
import type { TComponentBinding } from '../../adapter'
import type { TTextableEventProps } from '../textable'
import type { TReactComponentProps } from '../../types'

/** События слоя Button. */
export type TButtonEventProps = TTextableEventProps & {
	onChangeView?: (value: TButtonView) => void
}

export type ButtonProps = TReactComponentProps<IButtonProps, IButton> &
	TButtonEventProps &
	HTMLAttributes<HTMLElement>

/** Хук слоя Button. */
export function useButton(props: ButtonProps): TComponentBinding<IButton> {
	return useComponent<IButtonProps, IButton>(ButtonDescriptor, props)
}

export { Button } from './Button'
