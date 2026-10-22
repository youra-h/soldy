import {
	SelectCollectionItemDescriptor,
	SelectItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { ISelectItem, TSelectItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupSelectItem — setup-слой опции Select.
 *
 * Два контекста, как у элементов Vue и Svelte: собственный
 * (`SelectItemDescriptor` — текст и значение опции) и фасада
 * (`SelectCollectionItemDescriptor` — выбор, порядок и сторона отметки поля).
 * Расширение элемента берёт лифтом из слоя Select движок и регистратор и
 * отдаёт фасаду контекст опции.
 *
 * В коллекцию опция входит, когда контекст фасада принят, — в `ngOnInit`: и
 * опция разметки в панели, увезённой в `body`, — DI идёт по дереву
 * объявлений, и слой Select она видит там, где её написали.
 */
export function setupSelectItem(
	ctrl: ISelectItem | undefined,
	props: object,
): TBinding<ISelectItem, TSelectItemCollectionFacade> {
	const adapter = createAngularAdapterContext(SelectItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		SelectCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
