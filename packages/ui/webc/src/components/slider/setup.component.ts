/**
 * setupSlider — setup-слой Slider.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента) и связывает его с элементом через
 * useAdapter. Логики здесь нет: нажатия и протяжку ведёт
 * `TSlidePointerPlugin`, клавиши и жест скринридера — `TSlideKeyboardPlugin`,
 * позиции и состояния ручек, меток и заливки считает ядро. На корень классы и
 * наборы кладёт база элемента, а дорожку, ручки, поля и метки ведёт шаблон.
 *
 * Поле формы `Field` над ползунком: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом. Своего канала `id` у ползунка нет: `id` от поля ядро кладёт в
 * его `aria`, и у одной ручки он доходит до её поля.
 */

import { SliderDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { ISlider } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupSlider(
	host: HTMLElement,
	ctrl: ISlider | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<ISlider> {
	const adapter = createWebcAdapterContext(host, SliderDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
