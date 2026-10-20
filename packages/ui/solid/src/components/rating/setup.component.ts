/**
 * setupRating — setup-слой Rating.
 *
 * Создаёт adapter-context (`createSolidAdapterContext`) и связывает его с
 * Solid через useAdapter. Тело компонента Solid выполняется один раз,
 * поэтому контекст достаточно положить в обычную константу — useRef-обвязки,
 * как в React, не нужно.
 *
 * Логики здесь нет: нажатие и протяжку по звёздам ведёт
 * `TSlidePointerPlugin`, клавиши и жест скринридера — `TSlideKeyboardPlugin`,
 * наведение — `TRatingHoverPlugin`, как звучит значение — `TRatingNamesPlugin`,
 * обязательность — `TRatingValidityPlugin`, долю заливки звёзд считает ядро.
 * Поле формы `Field` над оценкой: ошибку, `id` и ссылки на части оценка берёт
 * от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * предка, а своему содержимому опускает пустую связку в свой слой
 * (`useElevator`). Детям слой отдаёт `Elevate` в разметке.
 */

import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { RatingProps } from './base.component'

export function setupRating(props: RatingProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(RatingDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
