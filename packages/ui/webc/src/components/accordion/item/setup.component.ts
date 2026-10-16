/**
 * setupAccordionItem — setup-слой секции Accordion.
 *
 * Два контекста, как у элементов Vue и Angular: собственный
 * (`AccordionItemDescriptor` — текст, значение, сторона стрелки) и фасада
 * (`AccordionCollectionItemDescriptor` — раскрыта ли секция, порядок, вид),
 * одной связкой. Расширение элемента берёт лифтом движок и регистратор
 * аккордеона — ближайшего выше по документу — и отдаёт фасаду контекст секции.
 * Порядок связок — как у Vue: фасад первым, и в коллекцию секция входит, когда
 * его контекст принят, — при подключении элемента.
 */

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
		elevator: createWebcElevator(host),
	})

	const item = useCollectionAdapter(itemAdapter, adapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
