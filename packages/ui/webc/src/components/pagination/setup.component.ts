import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { IPagination, TPaginationCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupPagination(
	host: HTMLElement,
	ctrl: IPagination | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IPagination, TPaginationCollectionFacade> {
	const adapter = createWebcAdapterContext(host, PaginationDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		PaginationCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
