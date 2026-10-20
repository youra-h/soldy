/**
 * setupNumberInput — setup-слой NumberInput.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Логики здесь нет: что набирается, решает ядро, правку браузера до него
 * доводит плагин набора, клавиши шага и кнопки шага с удержанием — свои
 * плагины на корне, очищает поле его команда `clear`.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) — из слоя лифта предка, а
 * своему содержимому опускает пустую связку в свой слой (`useElevator`):
 * контролы в слотах поля — его содержимое. Детям слой отдаёт `Elevate` в
 * разметке.
 */

import { NumberInputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { NumberInputProps } from './base.component'

export function setupNumberInput(props: NumberInputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(NumberInputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Текст и формат — по локали поддерева (плагин языка), имена кнопок
	// очистки и шага — плагин имён поля
	return { ...useAdapter(adapter, props), layer }
}
