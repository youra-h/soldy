/**
 * setupSwitch — setup-слой Switch.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Поле формы `Field` над переключателем: ошибку, `id` и ссылки на части
 * переключатель берёт от него своим расширением (`TFieldControlExtension`) —
 * из слоя лифта предка, а своему содержимому опускает пустую связку в свой
 * слой (`useElevator`). Детям слой отдаёт `Elevate` в разметке.
 */

import { SwitchDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { SwitchProps } from './base.component'

export function setupSwitch(props: SwitchProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SwitchDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	// Переключает значение плагин по `change` поля; отметку разметка пишет
	// свойством `<input>`
	return { ...useAdapter(adapter, props), layer }
}
