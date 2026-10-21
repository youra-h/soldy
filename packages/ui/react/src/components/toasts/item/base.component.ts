import type { IToastsItem } from '@soldy-ui/core'
import type { ToastsCollectionItemDescriptor, ToastsItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События тоста — свои (ядро и плагины) и фасада элемента коллекции. */
export type ToastsItemEventProps = EventProps<typeof ToastsItemDescriptor> &
	EventProps<typeof ToastsCollectionItemDescriptor>

/**
 * Пропсы тоста. Ставит его только регион менеджера — инстансом из коллекции
 * (`ctrl`) и пробросом слотов менеджера; наружу пакета тост не выходит.
 */
export type ToastsItemProps = UseDomProps<
	typeof ToastsItemDescriptor,
	IToastsItem,
	ToastsItemEventProps
>
