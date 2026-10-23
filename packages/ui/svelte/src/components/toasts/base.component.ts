import type { IToasts } from '@soldy-ui/core'
import type { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

export type ToastsEventProps = EventProps<typeof ToastsDescriptor> &
	EventProps<typeof ToastsCollectionDescriptor>

/** Атрибуты — региону: приложение в `children` разметки вокруг не получает. */
export type ToastsProps = UseDomProps<typeof ToastsDescriptor, IToasts, ToastsEventProps>
