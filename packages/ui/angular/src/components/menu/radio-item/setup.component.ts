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

/**
 * setupMenuRadioItem — setup-слой переключателя меню.
 *
 * Два контекста, как у флажка: собственный (`MenuRadioItemDescriptor` — текст,
 * значение и группа переключателя) и фасада
 * (`MenuCollectionRadioItemDescriptor` — вход в коллекцию меню и отметка, её
 * выбор). Группу — ближайшую `<div so-menu-radio-group>` — переключатель берёт
 * лифтом при сборке (`TMenuRadioItemExtension` на собственном контексте), до
 * входа в коллекцию: группа опустила себя в свой слой раньше, её `ngOnInit`
 * идёт раньше хуков её содержимого. Что в группе отмечен один, держит
 * коллекция меню.
 */
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
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
