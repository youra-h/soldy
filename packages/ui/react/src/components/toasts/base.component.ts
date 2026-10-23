import type { IToasts } from '@soldy-ui/core'
import type { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Toasts — свои и фасада коллекции. */
export type ToastsEventProps = EventProps<typeof ToastsDescriptor> &
	EventProps<typeof ToastsCollectionDescriptor>

/** Пропсы Toasts: атрибуты — региону, приложение в `children` обёртки не получает. */
export type ToastsProps = UseDomProps<typeof ToastsDescriptor, IToasts, ToastsEventProps>
