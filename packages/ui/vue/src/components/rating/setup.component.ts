import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	useIcon,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseRating, { type RatingProps } from './base.component'

/**
 * Логики здесь нет: нажатие и протяжку по звёздам ведёт `TSlidePointerPlugin`,
 * клавиши и жест скринридера — `TSlideKeyboardPlugin`, наведение —
 * `TRatingHoverPlugin`, как звучит значение — `TRatingNamesPlugin`, долю
 * заливки звёзд считает ядро. Разметка раскладывает то, что они отдали.
 *
 * Разделения атрибутов между корнем и полем (`useSplitAttrs`, как у CheckBox)
 * нет, как у Slider: указатель поле не ловит, и обработчик нажатия
 * потребителя на нём не сработал бы никогда. Атрибут потребителя достаётся
 * корню, имя полю даёт подпись `Label`, подпись поля формы `Field` или проп
 * `aria_label`.
 */
export default {
	name: '_Rating',
	extends: BaseRating,
	expose: useExpose(),
	setup(props: RatingProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(RatingDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return {
			...useAdapter(adapter, props, emit),
			defaultIconTag: useIcon('star'),
		}
	},
}
