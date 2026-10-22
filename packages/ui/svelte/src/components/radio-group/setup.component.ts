/**
 * setupRadioGroup — setup-слой RadioGroup.
 *
 * Два контекста, как у Vue: свой (`RadioGroupDescriptor`) и фасада коллекции
 * (`RadioGroupCollectionDescriptor`) на общем наборе, с тем же id
 * монтирования — от него общий `name` радио, когда своего имени у группы нет.
 *
 * Расширение коллекции опускает движок и регистратор радио лифтом
 * (`setContext`): радио, смонтированное внутри, войдёт в коллекцию группы при
 * своей инициализации. Drag-and-drop нет, как у Vue: радио одной группы стоят
 * где угодно в разметке, и порядка на экране у них нет.
 *
 * Поле формы `Field` связывается с группой, а не с радио: подпись поля
 * называет группу ссылкой, ошибка — группы (`TFieldControlExtension` на
 * своём контексте). Своему содержимому группа опускает пустую связку: радио и
 * контролы в их подписях связку поля не берут.
 */

import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { RadioGroupProps } from './base.component'

export function setupRadioGroup(
	getProps: () => RadioGroupProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const elevator = useElevator()
	const props = getProps()
	const adapter = createSvelteAdapterContext(RadioGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
		mountId,
	}).use(TFieldControlExtension, { elevator })
	const owner = useAdapter(adapter, getProps, receive)

	const collectionAdapter = createSvelteAdapterContext(
		RadioGroupCollectionDescriptor(),
		{
			props,
			mountId,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(
		collectionAdapter,
		getProps,
		() => owner.forwardProps,
	)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		attachElement: owner.attachElement,
		state: joinState(owner.state, collectionBinding.state),

		get forwardProps() {
			return collectionBinding.forwardProps
		},
	}
}
