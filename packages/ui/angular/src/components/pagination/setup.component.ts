import {
	PaginationCollectionDescriptor,
	PaginationDescriptor,
	TCollectionExtension,
} from '@soldy-ui/setup'
import type { IPagination, IPaginationProps, TPaginationCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupPagination — setup-слой Pagination.
 *
 * Два контекста, как у остальных коллекций: собственный (пропсы пагинации) и
 * фасада коллекции (окно), одной связкой. Логики здесь нет: страницы окна,
 * текущая, пропуски и связь текущей со значением — расширение коллекции
 * `pagination`, выключенность стрелок и переход на соседнюю страницу — сама
 * пагинация, имена стрелок — плагин имён. Движок и регистратор страниц
 * расширение коллекции опускает лифтом — в слой пагинации
 * (`provideElevator()` в её `providers`).
 *
 * `engine` — готовая коллекция снаружи, вход пагинации: фасад работает на ней,
 * а без неё собирает свою (`completeEngine`). Состава и ключа сверки снаружи
 * нет — страницы окна кладёт в движок расширение пагинации.
 */
export function setupPagination(
	ctrl: IPagination | undefined,
	props: object,
	engine: IPaginationProps['engine'],
): TBinding<IPagination, TPaginationCollectionFacade> {
	const adapter = createAngularAdapterContext(PaginationDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		PaginationCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
