/**
 * setupCheckBox — setup-слой CheckBox.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Поле формы `Field` над флажком: ошибку, `id` и ссылки на части флажок берёт
 * от него своим расширением (`TFieldControlExtension`) — из слоя лифта предка,
 * а своему содержимому опускает пустую связку в свой слой (`useElevator`).
 * Детям слой отдаёт `Elevate` в разметке.
 */

import { CheckBoxDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { CheckBoxProps } from './base.component'

export function setupCheckBox(props: CheckBoxProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(CheckBoxDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Переключает значение плагин флажка по `change` поля; отметку и «выбрано
	// частично» разметка пишет свойствами `<input>`
	return { ...useAdapter(adapter, props), layer }
}
