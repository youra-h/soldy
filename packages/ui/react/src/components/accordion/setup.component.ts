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
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(AccordionDescriptor(), { ctrl: props.ctrl, props })

		const collectionAdapter = create(
			AccordionCollectionDescriptor(),
			{
				props,
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		)
			.use(TCollectionExtension, { elevator })
			.use(TDragAndDropCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props),
		layer,
	}
}
