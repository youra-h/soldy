import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Выходы плагинов пункта с панелью — их читает шаблон: пометку панели владельцем. */
export type TMenuPopoverItemOutputs = DescriptorPluginOutputs<typeof MenuPopoverItemDescriptor>

/** Пункт с панелью: своей коллекции и слоя лифта нет — в панели лежит что угодно. */
export function setupMenuPopoverItem(
	ctrl: IMenuPopoverItem | undefined,
	props: object,
): TBinding<IMenuPopoverItem, TMenuItemCollectionFacade, TMenuPopoverItemOutputs> {
	const adapter = createAngularAdapterContext(MenuPopoverItemDescriptor(), { ctrl, props })
	// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: AngularElevatorFactory,
	})

	return joinBindings(owner, useCollectionAdapter(item))
}
