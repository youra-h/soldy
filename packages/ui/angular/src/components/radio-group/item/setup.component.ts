import {
	RadioGroupCollectionItemDescriptor,
	RadioGroupItemDescriptor,
	TCollectionItemExtension,
} from '@soldy-ui/setup'
import type { IRadioGroupItem, TRadioGroupItemCollectionFacade } from '@soldy-ui/core'
import {
	AngularElevatorFactory,
	createAngularAdapterContext,
	joinBindings,
	useAdapter,
	useCollectionAdapter,
} from '../../../adapter'
import type { TBinding } from '../../../adapter'

/**
 * setupRadioGroupItem — setup-слой радио.
 *
 * Два контекста, как у элементов остальных коллекций: собственный (пропсы
 * радио) и фасада (отмечено ли радио в группе), одной связкой. Расширение
 * элемента берёт лифтом из слоя группы движок и регистратор и отдаёт фасаду
 * контекст радио; в группу радио входит, когда контекст фасада принят, — в
 * `ngOnInit`, и на сервере тоже.
 */
export function setupRadioGroupItem(
	ctrl: IRadioGroupItem | undefined,
	props: object,
): TBinding<IRadioGroupItem, TRadioGroupItemCollectionFacade> {
	const adapter = createAngularAdapterContext(RadioGroupItemDescriptor(), { ctrl, props })
	const owner = useAdapter(adapter)

	const item = createAngularAdapterContext(
		RadioGroupCollectionItemDescriptor(),
		{ props },
		{ bundle: adapter.bundle },
	).use(TCollectionItemExtension, { item: adapter.instance, elevator: AngularElevatorFactory })

	return joinBindings(owner, useCollectionAdapter(item))
}
