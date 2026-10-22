import { MenuCollectionDescriptor, MenuDescriptor, TCollectionExtension } from '@soldy-ui/setup'
import type { IMenu, IMenuProps, TMenuCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** Меню и коллекция его пунктов; `engine` — готовая коллекция снаружи (`completeEngine`). */
export function setupMenu(
	ctrl: IMenu | undefined,
	props: object,
	engine: IMenuProps['engine'],
): TBinding<IMenu, TMenuCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		MenuCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
