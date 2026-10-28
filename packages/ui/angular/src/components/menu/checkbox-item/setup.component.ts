import {
	MenuCheckboxItemDescriptor,
	MenuCollectionCheckboxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IMenuCheckboxItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Флажок меню: отметка — у фасада, это выбор коллекции меню, а не своё состояние. */
export function setupMenuCheckboxItem(
	ctrl: IMenuCheckboxItem | undefined,
	props: object,
): TBinding<IMenuCheckboxItem, TMenuItemCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuCheckboxItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		MenuCollectionCheckboxItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: AngularElevatorFactory,
	})

	return joinBindings(owner, useCollectionAdapter(item))
}
