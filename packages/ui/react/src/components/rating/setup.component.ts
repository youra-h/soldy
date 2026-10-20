/**
 * useSetupRating — setup-слой Rating (аналог setup.component.ts во Vue).
 *
 * Логики здесь нет: нажатие и протяжку по звёздам ведёт `TSlidePointerPlugin`,
 * клавиши и жест скринридера — `TSlideKeyboardPlugin`, наведение —
 * `TRatingHoverPlugin`, как звучит значение — `TRatingNamesPlugin`, долю
 * заливки звёзд считает ядро. Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над оценкой: ошибку, `id` и ссылки на части оценка берёт
 * от него своим расширением (`TFieldControlExtension`) лифтом компонента.
 * Своему содержимому — слоту значка — она опускает пустую связку. Детям слой
 * лифта (`layer`) отдаёт `elevated` в разметке.
 */

import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { RatingProps } from './base.component'

export function useSetupRating(props: RatingProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(RatingDescriptor(), { ctrl: props.ctrl, props }).use(TFieldControlExtension, {
			elevator,
		}),
	)

	return { ...useAdapter(adapter, props), layer }
}
