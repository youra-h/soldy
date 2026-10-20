import type { IToastsItem } from '@soldy-ui/core'
import type { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События тоста — свои (ядро и плагины) и фасада тоста. */
export type ToastsItemEventProps = EventProps<typeof ToastsItemDescriptor> &
	EventProps<typeof ToastsCollectionItemDescriptor>

/**
 * Пропсы тоста. Тост — внутренняя часть менеджера: ставит его только регион,
 * по одному на показанный тост, и наружу пакета он не выходит.
 */
export type ToastsItemProps = UseDomProps<
	typeof ToastsItemDescriptor,
	IToastsItem,
	ToastsItemEventProps
>
