import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import type { IAccordion, TAccordionCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupAccordion(
	host: HTMLElement,
	ctrl: IAccordion | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IAccordion, TAccordionCollectionFacade> {
	const adapter = createWebcAdapterContext(host, AccordionDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)
	const elevator = createWebcElevator(host)

	const collectionAdapter = createWebcAdapterContext(
		host,
		AccordionCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
