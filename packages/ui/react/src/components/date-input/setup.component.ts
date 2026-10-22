/**
 * useSetupDateInput — setup-слой DateInput (аналог setup.component.ts во Vue).
 *
 * Создаёт adapter-context сборкой useAdapterContext — create(DateInputDescriptor(), ...)
 * и связывает его с React Runtime через useAdapter.
 *
 * Логики здесь нет: части, их текст и наборы отдаёт ядро, клавиши, указатель,
 * буфер обмена и касание ловят плагины поля на корне, очищает поле его
 * команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку и ссылки на подпись и справку поле
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * компонента. Своему содержимому — слотам — оно опускает пустую связку:
 * контролы в слотах поля — его содержимое. Детям слой лифта (`layer`) отдаёт
 * `elevated` в разметке. Деталь чужой разметки — поля DatePicker
 * (`embedded`) — связку не берёт: её взял DatePicker.
 */

import { DateInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { DateInputProps } from './base.component'

export function useSetupDateInput(props: DateInputProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(DateInputDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	// Формат — по локали поддерева (плагин языка), имя кнопки очистки —
	// плагин имён поля, `id` частей — плагин связок
	return { ...useAdapter(adapter, props), layer }
}
