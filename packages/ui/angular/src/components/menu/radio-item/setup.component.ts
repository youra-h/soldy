import {
	MenuCollectionRadioItemDescriptor,
	MenuRadioItemDescriptor,
	TCollectionItemExtension,
	TMenuRadioItemExtension,
} from '@soldy-ui/setup'
import type { IMenuRadioItem, TMenuItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/** Переключатель меню: группу берёт лифтом — её `ngOnInit` идёт раньше его сборки. */
export function setupMenuRadioItem(
	ctrl: IMenuRadioItem | undefined,
	props: object,
): TBinding<IMenuRadioItem, TMenuItemCollectionFacade> {
	const adapter = createAngularAdapterContext(MenuRadioItemDescriptor(), { ctrl, props }).use(
		TMenuRadioItemExtension,
		{ elevator: AngularElevatorFactory },
	)
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		MenuCollectionRadioItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, {
		item: adapter.instance,
		member: adapter,
		elevator: AngularElevatorFactory,
	})

	return joinBindings(owner, useCollectionAdapter(item))
}
