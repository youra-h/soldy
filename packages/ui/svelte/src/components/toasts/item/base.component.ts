import type { IToastsItem } from '@soldy-ui/core'
import type { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

export type ToastsItemEventProps = EventProps<typeof ToastsItemDescriptor> &
	EventProps<typeof ToastsCollectionItemDescriptor>

/** Внутренняя часть менеджера: наружу пакета не выходит. */
export type ToastsItemProps = UseDomProps<
	typeof ToastsItemDescriptor,
	IToastsItem,
	ToastsItemEventProps
>
