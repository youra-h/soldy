import {
	AccordionCollectionItemDescriptor,
	AccordionItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

export function setupAccordionItem(
	ctrl: IAccordionItem | undefined,
	props: object,
): TBinding<IAccordionItem, TAccordionItemCollectionFacade> {
	const adapter = createAngularAdapterContext(AccordionItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		AccordionCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
