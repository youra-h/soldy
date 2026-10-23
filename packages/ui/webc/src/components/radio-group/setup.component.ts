import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import type { IRadioGroup, TRadioGroupCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupRadioGroup(
	host: HTMLElement,
	ctrl: IRadioGroup | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IRadioGroup, TRadioGroupCollectionFacade> {
	// `Field` связывается с группой; радио под ней связку поля не берут
	const adapter = createWebcAdapterContext(host, RadioGroupDescriptor(), {
		ctrl,
		props,
	}).use(TFieldControlExtension, { elevator: createWebcElevator(host) })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		RadioGroupCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
