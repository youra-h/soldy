import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
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

/**
 * setupRadioGroup — setup-слой RadioGroup.
 *
 * Два контекста, как у остальных коллекций: собственный (пропсы группы) и
 * фасада коллекции (состав и отмеченное радио), одной связкой. Drag-and-drop
 * нет: радио одной группы стоят где угодно в разметке, и порядка на экране у
 * них нет. Движок и регистратор радио расширение коллекции опускает лифтом — в
 * слой группы (`provideElevator()` в её `providers`).
 *
 * `engine` — готовая коллекция снаружи, вход группы: фасад работает на ней, а
 * без неё собирает свою (`completeEngine`).
 */
export function setupRadioGroup(
	ctrl: IRadioGroup | undefined,
	props: object,
	engine: IRadioGroupProps['engine'],
): TBinding<IRadioGroup, TRadioGroupCollectionFacade> {
	const adapter = createAngularAdapterContext(RadioGroupDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const collectionAdapter = createAngularAdapterContext(
		RadioGroupCollectionDescriptor(),
		{ props, options: { owner: adapter.instance, engine } },
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(collectionAdapter))
}
