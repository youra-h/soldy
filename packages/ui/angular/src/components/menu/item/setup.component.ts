import {
	MenuCollectionItemDescriptor,
	MenuItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IMenuItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Пункт-действие: лифт отдаёт ему ближайшую коллекцию — меню или подменю. */
export function setupMenuItem(
	ctrl: IMenuItem | undefined,
	props: object,
): TBinding<IMenuItem, TMenuItemCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
