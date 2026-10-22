import {
	TCollectionExtension,
	TVirtualCollectionExtension,
	TableCollectionDescriptor,
	TableDescriptor,
} from '@soldy-ui/setup'
import type { ITable, ITableProps, TTableCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** `engine` — готовая коллекция снаружи: дали — фасад работает на ней, не дали — соберёт свою. */
export function setupTable(
	ctrl: ITable | undefined,
	props: object,
	engine: ITableProps['engine'],
): TBinding<ITable, TTableCollectionFacade> {
	const adapter = createAngularAdapterContext(TableDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		TableCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		.use(TVirtualCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
