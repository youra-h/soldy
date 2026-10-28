import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

export function setupAccordionItem(
	host: HTMLElement,
	ctrl: IAccordionItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IAccordionItem, TAccordionItemCollectionFacade> {
	const adapter = createWebcAdapterContext(host, AccordionItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: createWebcElevator(host),
	})

	// Фасад первым: в коллекцию секция входит, когда его контекст принят
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
