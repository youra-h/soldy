import {
	MenuCollectionItemDescriptor,
	MenuPopoverItemDescriptor,
	TCollectionItemExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenuPopoverItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding, TUpdateListener } from '../../../adapter'
import { createWebcElevator } from '../../../adapter/elevator'

/** Выходы плагинов пункта с панелью — шаблон читает из них пометку панели владельцем. */
export type TMenuPopoverItemOutputs = DescriptorPluginOutputs<typeof MenuPopoverItemDescriptor>

export function setupMenuPopoverItem(
	host: HTMLElement,
	ctrl: IMenuPopoverItem | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenuPopoverItem, TMenuItemCollectionFacade, TMenuPopoverItemOutputs> {
	const adapter = createWebcAdapterContext(host, MenuPopoverItemDescriptor(), { ctrl, props })

	const itemAdapter = createWebcAdapterContext(
		host,
		MenuCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		elevator: createWebcElevator(host),
	})

	// Фасад первым, как у пункта
	const item = useCollectionAdapter(itemAdapter, host, onUpdate)
	const owner = useAdapter(adapter, host, onUpdate)

	return joinBindings(owner, item)
}
