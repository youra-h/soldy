import { TextareaDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	useAdapter,
	useExpose,
	useSplitAttrs,
	VueElevatorFactory,
	createVueAdapterContext,
	type SetupContext,
} from '../../adapter'
import BaseTextarea, { type TextareaProps } from './base.component'

/**
 * Логики здесь нет: набранное в значение переносит `TInputPlugin`, высоту по
 * тексту — `TTextareaAutoresizePlugin`, текст счётчика пишет
 * `TTextareaNamesPlugin`, `data-limit` ставит ядро. Разметка раскладывает то,
 * что они отдали.
 *
 * Атрибуты потребителя делятся, как у Input (`useSplitAttrs`): класс и стиль —
 * корню, остальное — `<textarea>`, поверх её `aria`.
 */
export default {
	name: '_Textarea',
	inheritAttrs: false,
	extends: BaseTextarea,
	expose: useExpose(),
	setup(props: TextareaProps, { emit }: SetupContext) {
		// Поле формы `Field` над полем: ошибка, `id` и ссылки на части — от него
		const adapter = createVueAdapterContext(TextareaDescriptor(), {
			ctrl: props.ctrl,
			props,
		}).use(TFieldControlExtension, { elevator: VueElevatorFactory })

		return {
			...useAdapter(adapter, props, emit),
			...useSplitAttrs(),
		}
	},
}
