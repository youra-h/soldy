import {
	PaginationCollectionItemDescriptor,
	PaginationItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IPaginationItem, TPaginationItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupPaginationItem — setup-слой страницы пагинации.
 *
 * Два контекста, как у элементов остальных коллекций: собственный (пропсы
 * страницы) и фасада (текущая ли она), одной связкой. Своего у страницы в
 * разметке нет — ключ, текст и наборы ей пишет расширение коллекции, а
 * текущей её делает активация коллекции по нажатию. Расширение элемента берёт
 * лифтом из слоя пагинации движок и регистратор и отдаёт фасаду контекст
 * страницы.
 */
export function setupPaginationItem(
	ctrl: IPaginationItem | undefined,
	props: object,
): TBinding<IPaginationItem, TPaginationItemCollectionFacade> {
	const adapter = createAngularAdapterContext(PaginationItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		PaginationCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
