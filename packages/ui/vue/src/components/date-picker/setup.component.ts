import { DatePickerDescriptor } from '@soldy-ui/setup'
import { useAdapter, useIcon, createVueAdapterContext, type SetupContext } from '../../adapter'
import BaseDatePicker, { type DatePickerProps } from './base.component'

/**
 * Логики здесь нет: общее полям и календарю, значение, открытость и
 * подтверждение выбора держит ядро DatePicker, кнопку и Alt+↓ ловит плагин
 * открытия, нажатие мимо — `TDismissPlugin`, фокус панели — плагин фокуса,
 * жест — `TSwipePlugin`. Разметка раскладывает то, что они отдали.
 *
 * Поля, календарь и движок его коллекции — экземпляры ядра на всю жизнь
 * DatePicker, а не пропсы: их отдаём инстансами, как `field` у Select, — и
 * компоненты берут их целиком (`:ctrl`, `:engine`).
 */
export default {
	name: '_DatePicker',
	extends: BaseDatePicker,
	setup(props: DatePickerProps, { emit }: SetupContext) {
		const adapter = createVueAdapterContext(DatePickerDescriptor(), {
			ctrl: props.ctrl,
			props,
		})
		const picker = adapter.instance

		return {
			// Выход `dismiss_ownerAttribute` шаблон раскладывает на панель
			...useAdapter(adapter, props, emit),
			/**
			 * Инстанс — для кнопок подвала при `confirmable`: «OK» принимает
			 * выбор (`confirm`), «Отмена» закрывает панель, а черновик сбрасывает
			 * само закрытие. Возврат фокуса — забота плагина, разметка о нём не
			 * знает.
			 */
			picker,
			field: picker.field,
			start: picker.start,
			end: picker.end,
			calendar: picker.calendar,
			engine: picker.engine,
			calendarIconTag: useIcon('calendar'),
		}
	},
}
