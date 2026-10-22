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

/** Пагинация: страницы окна кладёт в движок расширение коллекции `pagination`. */
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
