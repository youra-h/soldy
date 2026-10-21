/**
 * setupRating — setup-слой Rating.
 *
 * Собирает компонент (`createWebcAdapterContext` — с локалью ближайшего
 * `<so-locale-provider>` вверх от элемента: по ней плагин имён пишет, как
 * звучит значение, а плагин обязательности — ошибку поля) и связывает его с
 * элементом через useAdapter. Логики здесь нет: нажатие и протяжку по звёздам
 * ведёт `TSlidePointerPlugin`, клавиши и жест скринридера —
 * `TSlideKeyboardPlugin`, наведение — `TRatingHoverPlugin`, долю заливки звёзд
 * считает ядро. На корень классы и наборы кладёт база элемента, а звёзды, поле
 * и его `aria` ведёт шаблон.
 *
 * Поле формы `Field` над оценкой: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) — ближайшую
 * связку вверх по документу, а своему содержимому опускает пустую связку
 * своим хостом.
 */

import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

export function setupRating(
	host: HTMLElement,
	ctrl: IRating | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IRating> {
	const adapter = createWebcAdapterContext(host, RatingDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
