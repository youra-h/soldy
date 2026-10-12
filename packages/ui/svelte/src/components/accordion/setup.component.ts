/**
 * setupAccordion — setup-слой Accordion.
 *
 * Два контекста, как у Vue: свой (`AccordionDescriptor`) и фасада коллекции
 * (`AccordionCollectionDescriptor`) на общем наборе, с тем же id
 * монтирования.
 *
 * Расширения коллекции опускают движок и регистратор секций лифтом
 * (`setContext`): секция, смонтированная внутри, войдёт в коллекцию
 * аккордеона при своей инициализации.
 */

import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { AccordionProps } from './base.component'

export function setupAccordion(getProps: () => AccordionProps, mountId: string) {
	const props = getProps()
	const adapter = createSvelteAdapterContext(AccordionDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	})
	const owner = useAdapter(adapter, getProps)

	const collectionAdapter = createSvelteAdapterContext(
		AccordionCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: SvelteElevatorFactory })
		.use(TDragAndDropCollectionExtension, { elevator: SvelteElevatorFactory })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
