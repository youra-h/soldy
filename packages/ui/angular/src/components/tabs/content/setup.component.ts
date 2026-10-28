import {
	TTabsContentBindingExtension,
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
} from '@soldy-ui/setup'
import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Панель таба: свой таб по `value` находит лифтом `TTabsContentBindingExtension`. */
export function setupTabsContent(
	ctrl: ITabsContent | undefined,
	props: object,
): TBinding<ITabsContent, TTabsContentCollectionFacade> {
	const adapter = createAngularAdapterContext(TabsContentDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const content = createAngularAdapterContext(
		TabsCollectionContentDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TTabsContentBindingExtension, { adapter, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(content))
}
