/**
 * setupDateInput — setup-слой DateInput.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель,
 * буфер обмена и касание ловят плагины поля на корне, очищает поле его
 * команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку и ссылки на подпись и справку поле
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * предка, а своему содержимому опускает пустую связку в свой слой
 * (`useElevator`): контролы в слотах поля — его содержимое. Детям слой отдаёт
 * `Elevate` в разметке. Деталь чужой разметки — поля DatePicker
 * (`embedded`) — связку не берёт: её взял DatePicker.
 */

import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { DateInputProps } from './base.component'

export function setupDateInput(props: DateInputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(DateInputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Формат — по локали поддерева (плагин языка), имя кнопки очистки —
	// плагин имён поля, `id` частей — плагин связок
	return { ...useAdapter(adapter, props), layer }
}
