import {
	TCollectionExtension,
	TFieldControlExtension,
	RadioGroupDescriptor,
	RadioGroupCollectionDescriptor,
} from '@soldy-ui/setup'
import {
	useAdapter,
	joinBindings,
	useExpose,
	useCollectionAdapter,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseRadioGroup, { type RadioGroupProps } from './base.component'

/**
 * Два контекста, как у остальных коллекций: собственный (props группы) и
 * фасада коллекции (состав и отмеченное радио). Drag-and-drop нет: радио
 * одной группы стоят где угодно в разметке, и порядка на экране у них нет.
 *
 * Поле формы `Field` связывается с группой, а не с радио: подпись поля
 * называет группу ссылкой, ошибка — группы.
 */
export default {
	name: '_RadioGroup',
	extends: BaseRadioGroup,
	expose: useExpose(),
	setup(props: RadioGroupProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(RadioGroupDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		const refs = useAdapter(adapter, props, emit)

		const collectionAdapter = createVueAdapterContext(
			RadioGroupCollectionDescriptor(),
			{
				props,
				// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
				// не создаёт, лишь доложит недостающие расширения в неё же.
				// Не дали — соберёт свою. Развилка в `completeEngine`
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator: VueElevatorFactory })

		const refsCollection = useCollectionAdapter(collectionAdapter, props, emit)

		return joinBindings(refs, refsCollection)
	},
}
