import {
	MenuCollectionDescriptor,
	MenuDescriptor,
	TCollectionExtension,
	type DescriptorPluginOutputs,
} from '@soldy-ui/setup'
import type { IMenu, TMenuCollectionFacade } from '@soldy-ui/core'
import {
	createWebcAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Выходы плагинов Menu — шаблон читает из них пометку панели владельцем. */
export type TMenuOutputs = DescriptorPluginOutputs<typeof MenuDescriptor>

export function setupMenu(
	host: HTMLElement,
	ctrl: IMenu | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IMenu, TMenuCollectionFacade, TMenuOutputs> {
	const adapter = createWebcAdapterContext(host, MenuDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter, host, onUpdate)

	const collectionAdapter = createWebcAdapterContext(
		host,
		MenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine: props['engine'] } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: createWebcElevator(host) })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter, host, onUpdate))
}
