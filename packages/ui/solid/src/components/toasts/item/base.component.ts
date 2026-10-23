import type { IToastsItem } from '@soldy-ui/core'
import type { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События тоста — свои и фасада. */
export type ToastsItemEventProps = EventProps<typeof ToastsItemDescriptor> &
	EventProps<typeof ToastsCollectionItemDescriptor>

/** Пропсы тоста — внутренней части менеджера: ставит его только регион. */
export type ToastsItemProps = UseDomProps<
	typeof ToastsItemDescriptor,
	IToastsItem,
	ToastsItemEventProps
>
