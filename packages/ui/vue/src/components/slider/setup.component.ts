import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseSlider, { type SliderProps } from './base.component'

/**
 * Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши и
 * жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек, меток
 * и заливки считает ядро, связку с полем формы `Field` — его расширение.
 * Разметка раскладывает то, что они отдали.
 *
 * Разделения атрибутов между корнем и полем (`useSplitAttrs`, как у CheckBox)
 * нет: полей столько, сколько ручек, и атрибут потребителя достаётся корню.
 * Имя одной ручке даёт подпись `Label`, подпись поля формы `Field` или проп
 * `aria_label`. У нескольких ручек корень — группа: её называют подпись поля
 * формы и `aria_label`, а имя каждой ручки, первой тоже, — `thumbLabels`,
 * полностью: в подписи `Label` значение второго поля вошло бы в имя первого.
 */
export default {
	name: '_Slider',
	extends: BaseSlider,
	expose: useExpose(),
	setup(props: SliderProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SliderDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return useAdapter(adapter, props, emit)
	},
}
