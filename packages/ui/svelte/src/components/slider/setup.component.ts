/**
 * setupSlider — setup-слой Slider.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда. Так
 * же — приёмник корня (`receive`): запись в связываемый проп `ref`
 * компонента, `$bindable` компилятор тоже пускает только в компонент.
 *
 * Поле формы `Field` над ползунком: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * (`getContext`).
 */

import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	createSvelteAdapterContext,
	useAdapter,
	useElevator,
	type TRootReceiver,
} from '../../adapter'
import type { SliderProps } from './base.component'

export function setupSlider(getProps: () => SliderProps, mountId: string, receive: TRootReceiver) {
	const elevator = useElevator()
	const adapter = createSvelteAdapterContext(SliderDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator })

	// Логики здесь нет: нажатия и протяжку ведёт `TSlidePointerPlugin`, клавиши
	// и жест скринридера — `TSlideKeyboardPlugin`, позиции и состояния ручек,
	// меток и заливки считает ядро, связку с полем формы `Field` — его
	// расширение
	return useAdapter(adapter, getProps, receive)
}
