import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import type { IRadioGroup, IRadioGroupProps, TRadioGroupCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../adapter'
import type { TBinding } from '../../adapter'

/** Группа радио: поле `Field` связывается с группой, а радио внутри связку поля не берут. */
export function setupRadioGroup(
	ctrl: IRadioGroup | undefined,
	props: object,
	engine: IRadioGroupProps['engine'],
): TBinding<IRadioGroup, TRadioGroupCollectionFacade> {
	const adapter = createAngularAdapterContext(RadioGroupDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		RadioGroupCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
