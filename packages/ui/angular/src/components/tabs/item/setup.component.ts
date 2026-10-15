import {
	TCollectionItemExtension,
	TabsCollectionItemDescriptor,
	TabsItemDescriptor,
} from '@soldy-ui/setup'
import type { ITabsItem, TTabsItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupTabsItem — setup-слой таба.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`TabsItemDescriptor` — текст, значение, закрываемость) и фасада
 * (`TabsCollectionItemDescriptor` — активность, порядок, итог закрываемости).
 * Расширение элемента берёт лифтом из слоя набора движок и регистратор и
 * отдаёт фасаду контекст таба.
 *
 * В коллекцию таб входит, когда контекст фасада принят, — в `ngOnInit`, и на
 * сервере тоже.
 */
export function setupTabsItem(
	ctrl: ITabsItem | undefined,
	props: object,
): TBinding<ITabsItem, TTabsItemCollectionFacade> {
	const adapter = createAngularAdapterContext(TabsItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		TabsCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
