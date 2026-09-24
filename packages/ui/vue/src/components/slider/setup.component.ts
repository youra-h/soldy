import { SliderDescriptor } from '@soldy-ui/setup'
import { useAdapter, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseSlider, { type SliderProps } from './base.component'

/**
 * Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши и
 * жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек, меток
 * и заливки считает ядро. Разметка раскладывает то, что они отдали.
 *
 * Разделения атрибутов между корнем и полем (`useSplitAttrs`, как у CheckBox)
 * нет: полей столько, сколько ручек, и атрибут потребителя достаётся корню.
 * Имя полям — пропом `aria_label` или подписью `Label`, ручкам по отдельности —
 * `thumbLabels`.
 */
export default {
	name: '_Slider',
	extends: BaseSlider,
	setup(props: SliderProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(SliderDescriptor(), {
			ctrl: props.ctrl,
			props,
		})

		return useAdapter(adapter, props, emit)
	},
}
