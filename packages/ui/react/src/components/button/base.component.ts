/**
 * Button — конкретный компонент на базе TButton.
 */

import type { HTMLAttributes } from 'react'
import type { IButton, IButtonProps, TButtonEvents } from '@soldy/core'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps, TElementEventProps } from '../../adapter'

/** События слоя Button (core-события + element-плагин), выведены автоматически. */
export type TButtonEventProps = ReactEventProps<TButtonEvents> & TElementEventProps

export type ButtonProps = TReactComponentProps<IButtonProps, IButton> &
	TButtonEventProps &
	HTMLAttributes<HTMLElement>
