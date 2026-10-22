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

/**
 * setupMenuCheckboxItem — setup-слой флажка меню.
 *
 * Два контекста, как у пункта: собственный (`MenuCheckboxItemDescriptor` —
 * текст и значение) и фасада (`MenuCollectionCheckboxItemDescriptor` — вход в
 * коллекцию меню и отметка: это выбор коллекции, а не своё состояние,
 * записываемый вход `selected` и выход `(soChangeSelected)`).
 */
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
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
