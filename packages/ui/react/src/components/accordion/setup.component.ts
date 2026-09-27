/**
 * useSetupAccordion — setup-слой Accordion (аналог setup.component.ts во Vue).
 *
 * Два контекста одной сборкой: свой (`AccordionDescriptor`) и фасада
 * коллекции (`AccordionCollectionDescriptor`) на общем наборе. Фасад собран на
 * инстансе владельца, поэтому пересобираются и уничтожаются они вместе.
 *
 * Расширения коллекции опускают движок и регистратор секций лифтом
 * компонента; детям его слой (`layer`) отдаёт `Elevate` в разметке.
 */

import {
	AccordionCollectionDescriptor,
	AccordionDescriptor,
	TCollectionExtension,
	TDragAndDropCollectionExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { AccordionProps } from './base.component'

export function useSetupAccordion(props: AccordionProps) {
	const {
		contexts: [adapter, collection],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(AccordionDescriptor(), { ctrl: props.ctrl, props })

		const collection = create(
			AccordionCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `resolveEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			.use(TDragAndDropCollectionExtension, { elevator })

		return [adapter, collection] as const
	})

	const owner = useAdapter(adapter, props)
	const facade = useCollectionAdapter(collection, props, owner.forwardProps)

	return {
		...owner,
		forwardProps: facade.forwardProps,
		state: { ...owner.state, ...facade.state },
		layer,
	}
}
