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

/**
 * setupMenuItem — setup-слой пункта-действия меню.
 *
 * Два контекста, как у элемента ListBox: собственный (`MenuItemDescriptor` —
 * текст и значение) и фасада (`MenuCollectionItemDescriptor` — вход в
 * коллекцию меню). Расширение элемента берёт лифтом из слоя меню движок и
 * регистратор и отдаёт фасаду контекст пункта; через него строка зовёт
 * нажатие — решает меню.
 *
 * В коллекцию пункт входит, когда контекст фасада принят, — в `ngOnInit`, и на
 * сервере тоже. Пункт под подменю входит в коллекцию подменю: лифт отдаёт
 * ближайшую.
 */
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
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
