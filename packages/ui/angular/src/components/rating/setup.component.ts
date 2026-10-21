import { RatingDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import type { IRating } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupRating — setup-слой Rating: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Логики здесь нет: нажатие и протяжку по звёздам ведёт `TSlidePointerPlugin`,
 * клавиши и жест скринридера — `TSlideKeyboardPlugin`, наведение —
 * `TRatingHoverPlugin`, как звучит значение — `TRatingNamesPlugin`, ошибку
 * обязательной оценки — `TRatingValidityPlugin`, долю заливки звёзд считает
 * ядро. Разметка раскладывает то, что они отдали.
 *
 * Поле формы `Field` над оценкой: ошибку, ссылки на части и `id` поля оценка
 * берёт от него своим расширением (`TFieldControlExtension`) — из слоя лифта
 * над собой, а своему содержимому опускает пустую связку в свой слой
 * (`provideElevator()` в её `providers`): контролы в её слотах — её
 * содержимое.
 */
export function setupRating(ctrl: IRating | undefined, props: object): TBinding<IRating> {
	const adapter = createAngularAdapterContext(RatingDescriptor(), { ctrl, props }).use(
		TFieldControlExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
