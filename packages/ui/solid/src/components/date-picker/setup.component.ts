/**
 * setupDatePicker — setup-слой DatePicker.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Логики здесь нет, как у Vue: общее полям и календарю, значение, открытость
 * и подтверждение выбора держит ядро DatePicker, очищает его команда `clear`,
 * кнопку календаря и Alt+↓ ловит плагин открытия, нажатие мимо —
 * `TDismissPlugin`, фокус панели — плагин фокуса, жест — `TSwipePlugin`.
 * Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над DatePicker связывается с ним, а не с его полями:
 * поля — детали его разметки (`embedded`), и связку DatePicker берёт своим
 * расширением (`TFieldControlExtension`), а своему содержимому опускает
 * пустую в свой слой (`useElevator`). Детям слой отдаёт `Elevate` в разметке.
 *
 * Разметке отдаёт ещё две вещи. Якорь панели — `rootElement`, аксессор
 * привязанного корня. Поля, календарь и движок его коллекции — экземпляры
 * ядра на всю жизнь DatePicker, а не пропсы: разметка отдаёт их компонентам
 * целиком (`ctrl`, `engine`), как Select — своё поле.
 */

import { DatePickerDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DatePickerProps } from './base.component'

export function setupDatePicker(props: DatePickerProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DatePickerDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })
	const picker = adapter.instance

	// Выход `dismiss_ownerAttribute` разметка кладёт спредом на панель
	return {
		...useAdapter(adapter, props),
		layer,
		field: picker.field,
		start: picker.start,
		end: picker.end,
		calendar: picker.calendar,
		engine: picker.engine,
	}
}
