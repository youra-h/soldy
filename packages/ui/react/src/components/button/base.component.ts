import type { IButton } from '@soldy/core'
import type { ButtonDescriptor } from '@soldy/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События слоя Button (core + плагины), выведены из дескриптора автоматически. */
export type TButtonEventProps = EventProps<typeof ButtonDescriptor>

export type ButtonProps = UseDomProps<typeof ButtonDescriptor, IButton, TButtonEventProps>

