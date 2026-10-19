/**
 * setupInput — setup-слой Input.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части поле берёт от
 * него своим расширением (`TFieldControlExtension`) — из слоя лифта предка, а
 * своему содержимому опускает пустую связку в свой слой (`useElevator`):
 * контролы в слотах поля — его содержимое. Детям слой отдаёт `Elevate` в
 * разметке.
 */

import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { InputProps } from './base.component'

export function setupInput(props: InputProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(InputDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Текст в ядро несёт плагин ввода по `input` поля, имя кнопки очистки
	// (`clearAria`) пишет плагин имён формы по локали поддерева
	return { ...useAdapter(adapter, props), layer }
}
