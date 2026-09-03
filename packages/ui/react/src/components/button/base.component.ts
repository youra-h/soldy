/**
 * Button — конкретный компонент на базе TButton.
 */

import type { HTMLAttributes } from 'react'
import type { IButton, IButtonProps, TButtonView } from '@soldy/core'
import type { TTextableEventProps } from '../textable'
import type { TReactComponentProps } from '../../types'

/** События слоя Button. */
export type TButtonEventProps = TTextableEventProps & {
	onChangeView?: (value: TButtonView) => void
}

export type ButtonProps = TReactComponentProps<IButtonProps, IButton> &
	TButtonEventProps &
	HTMLAttributes<HTMLElement>
