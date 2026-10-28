import {
	TCollectionItemExtension,
	ToastsCollectionItemDescriptor,
	ToastsItemDescriptor,
} from '@soldy-ui/setup'
import type { IToastsItem, TToastsItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupToastsItem(
	host: HTMLElement,
	ctrl: IToastsItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IToastsItem, TToastsItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, ToastsItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		ToastsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
