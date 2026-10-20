/**
 * setupSlider — setup-слой Slider.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши и
 * жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек, меток
 * и заливки считает ядро. Поле формы `Field` над ползунком: ошибку, `id` и
 * ссылки на части ползунок берёт от него своим расширением
 * (`TFieldControlExtension`) — из слоя лифта предка, а своему содержимому
 * опускает пустую связку в свой слой (`useElevator`): контролы в слотах
 * меток и подсказки — его содержимое. Детям слой отдаёт `Elevate` в разметке.
 */

import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { SliderProps } from './base.component'

export function setupSlider(props: SliderProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(SliderDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
