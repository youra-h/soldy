import {
	SelectCollectionDescriptor,
	SelectDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
	TVirtualCollectionExtension,
} from '@soldy-ui/setup'
import type { ISelect, ISelectProps, TSelectCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** `engine` — готовая коллекция снаружи: дали — фасад работает на ней, не дали — соберёт свою. */
export function setupSelect(
	ctrl: ISelect | undefined,
	props: object,
	engine: ISelectProps['engine'],
): TBinding<ISelect, TSelectCollectionFacade> {
	// Поле формы `Field` связывается с Select, а не с его полем: поле — деталь разметки
	const adapter = createAngularAdapterContext(SelectDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		SelectCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	)
		.use(TCollectionExtension, { elevator: AngularElevatorFactory })
		.use(TVirtualCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
