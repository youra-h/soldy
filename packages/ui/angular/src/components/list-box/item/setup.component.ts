import {
	ListBoxCollectionItemDescriptor,
	ListBoxItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IListBoxItem, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** В коллекцию элемент входит, когда принят контекст фасада, — и на сервере тоже. */
export function setupListBoxItem(
	ctrl: IListBoxItem | undefined,
	props: object,
): TBinding<IListBoxItem, TListBoxItemCollectionFacade> {
	const adapter = createAngularAdapterContext(ListBoxItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		ListBoxCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { adapter, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
