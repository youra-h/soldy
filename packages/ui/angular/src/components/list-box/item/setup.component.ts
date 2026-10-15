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

/**
 * setupListBoxItem — setup-слой элемента ListBox.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`ListBoxItemDescriptor` — текст и значение) и фасада
 * (`ListBoxCollectionItemDescriptor` — выбор, порядок, вид и сторона отметки
 * списка). Расширение элемента берёт лифтом из слоя списка движок и
 * регистратор и отдаёт фасаду контекст элемента.
 *
 * В коллекцию элемент входит, когда контекст фасада принят, — в `ngOnInit`,
 * и на сервере тоже: элемент разметки есть в серверной разметке вместе с тем,
 * что пишет ему коллекция.
 */
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
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
