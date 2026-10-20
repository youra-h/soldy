/**
 * useSetupSlider — setup-слой Slider (аналог setup.component.ts во Vue).
 *
 * Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши и
 * жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек, меток
 * и заливки считает ядро. Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над ползунком: ошибку, `id` и ссылки на части ползунок
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * компонента. Своему содержимому — слотам меток и подсказок — он опускает
 * пустую связку. Детям слой лифта (`layer`) отдаёт `elevated` в разметке.
 */

import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { SliderProps } from './base.component'

export function useSetupSlider(props: SliderProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(SliderDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
