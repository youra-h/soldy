/**
 * setupAccordion — setup-слой Accordion.
 *
 * Два контекста, как у Vue и Svelte: свой (`AccordionDescriptor`) и фасада
 * коллекции (`AccordionCollectionDescriptor`) на общем наборе. Оба
 * собираются один раз, при выполнении тела компонента; фасад делит набор
 * аккордеона, и id монтирования у него аккордеона.
 *
 * Расширения коллекции опускают движок и регистратор секций в слой лифта
 * аккордеона (`useElevator`), детям его отдаёт `Elevate` в разметке: секция,
 * смонтированная внутри, войдёт в коллекцию аккордеона при своей сборке.
 */

import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { AccordionProps } from './base.component'

export function setupAccordion(props: AccordionProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(AccordionDescriptor(), { ctrl: props.ctrl, props })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		AccordionCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator })
		.use(TDragAndDropCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
