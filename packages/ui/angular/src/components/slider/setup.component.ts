import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISlider } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupSlider — setup-слой Slider: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши и
 * жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек, меток
 * и заливки считает ядро. Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над ползунком: ошибку, ссылки на части и `id` (одной
 * ручке, в её набор) ползунок берёт от него своим расширением
 * (`TFieldControlExtension`) — из слоя лифта над собой, а своему содержимому
 * опускает пустую связку в свой слой (`provideElevator()` в его `providers`):
 * контролы в его слотах — его содержимое.
 */
export function setupSlider(ctrl: ISlider | undefined, props: object): TBinding<ISlider> {
	const adapter = createAngularAdapterContext(SliderDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
