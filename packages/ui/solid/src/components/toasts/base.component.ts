import type { IToasts } from '@soldy-ui/core'
import type { ToastsCollectionDescriptor, ToastsDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Toasts — свои и фасада коллекции. */
export type ToastsEventProps = EventProps<typeof ToastsDescriptor> &
	EventProps<typeof ToastsCollectionDescriptor>

/** Пропсы Toasts. Атрибуты — региона: своей разметки вокруг `children` у менеджера нет. */
export type ToastsProps = UseDomProps<typeof ToastsDescriptor, IToasts, ToastsEventProps>
