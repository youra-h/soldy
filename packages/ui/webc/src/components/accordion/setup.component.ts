/**
 * setupAccordion — setup-слой Accordion.
 *
 * Два контекста, как у Vue и Angular: свой (`AccordionDescriptor`) и фасада
 * коллекции (`AccordionCollectionDescriptor`) на общем наборе, одной связкой.
 * Расширения коллекции опускают движок и регистратор секций лифтом — хосту
 * аккордеона: секции, что стоят ниже, находят их вверх по документу, а список
 * в панели секции — свой, ближайший к нему.
 *
 * `engine` — готовая коллекция снаружи, свойство элемента (`el.engine`):
 * фасад работает на ней, а без неё собирает свою (`completeEngine`).
 */

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

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, adapter, host, onUpdate))
}
