/**
 * Button — конкретный компонент на базе TButton.
 */

import type { HTMLAttributes } from 'react'
import type { IButton } from '@soldy/core'
import type { ButtonDescriptor, DescriptorProps, DescriptorAllEvents } from '@soldy/setup'
import type { TReactComponentProps } from '../../types'
import type { ReactEventProps } from '../../adapter'

/** События слоя Button (core + плагины), выведены из дескриптора автоматически. */
export type TButtonEventProps = ReactEventProps<DescriptorAllEvents<typeof ButtonDescriptor>>

export type ButtonProps = TReactComponentProps<DescriptorProps<typeof ButtonDescriptor>, IButton> &
	TButtonEventProps &
	HTMLAttributes<HTMLElement>
