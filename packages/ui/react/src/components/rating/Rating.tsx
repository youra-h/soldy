import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	roleIcon,
	toAriaProps,
	toReactStyle,
	toRootProps,
} from '../../adapter'
import { useSetupRating } from './setup.component'
import type { RatingProps } from './base.component'

/** Значок звезды без слота — иконка по роли, компонент на роль один на модуль (`roleIcon`). */
const Star = roleIcon('star')

/**
 * Rating — оценка звёздами: ползунок с одной ручкой (APG, Rating Slider).
 * Значение — число на шкале от 0 до `max`, звёзды — его зрительная шкала.
 * Корень рисуется по `tag`, по умолчанию `span`: оценку кладут в подпись
 * `Label`, а внутри `label` HTML разрешает только строчную разметку. Поэтому и
 * всё внутри — `span`.
 *
 * Размер, вариант и только чтение приходят классами корня (`--size-*`,
 * `--variant-*`, `--readonly`), состояние — набором `dataset`
 * (`data-disabled`), `dir` — в `attrs`. Обработчиков здесь нет: нажатие ловит
 * плагин указателя на корне, наведение — плагин наведения там же, клавиши и
 * жест скринридера — плагин клавиатуры на поле.
 *
 * Атрибуты потребителя — корню, как у Vue: указатель поле не ловит, и
 * обработчик нажатия потребителя на нём не сработал бы никогда. Имя полю даёт
 * подпись `Label`, подпись поля формы `Field` или проп `aria_label`.
 *
 * Дорожка — ряд звёзд. Ячейки равные и встык, поэтому доля её коробки по оси
 * — доля шкалы: точку указателя в значение переводят по дорожке, не зная о
 * звёздах. Ручку и поле плагины находят по классам и только прямыми детьми,
 * как у Slider: `__thumb` — ребёнок дорожки, `input` — ребёнок ручки.
 *
 * Звезда — по одной на единицу шкалы, под `aria-hidden`: значение объявляет
 * поле. Доля заливки — в стиле звезды (`--so-rating-fraction`, число от 0 до
 * 1). Слоёв два, оба — одна иконка: пустая звезда снизу и залитая сверху, в
 * слое, обрезанном по доле. Значок — `svg` роли `star`, а не компонент Icon,
 * как отметка CheckBox: иконок по две на звезду, а оценок в списке отзывов —
 * десятки. Слот `icon` заменяет значок в обоих слоях; какой слой он рисует,
 * говорит `filled`, какую звезду — `value`.
 *
 * Поле — нативный `input[type="range"]` в невидимой ручке во весь ряд, как у
 * Slider: мобильный скринридер двигает его своим жестом, `name`, `disabled` и
 * отправку формы даёт браузер. Значение поля ведёт ядро (`NativeInput`), имя,
 * `aria-valuetext` и `aria-readonly` — набор `aria`.
 *
 * Поле формы `Field` над оценкой отдаёт ей ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому оценка опускает пустую
 * связку. Поэтому содержимое слота значка — в слое лифта оценки (`elevated`).
 */
export function Rating(props: RatingProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupRating(props)

	const { rendered, tag, attrs, aria, dataset, stars, max, step, value, id, name, disabled } =
		state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы и атрибуты потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, dataset], forwardProps)}>
			<span className="so-rating__track">
				{stars?.map((star) => (
					<span
						key={star.value}
						className="so-rating__star"
						style={toReactStyle(star.style)}
						aria-hidden="true"
					>
						{elevated(
							layer,
							renderSlot(props.icon, { value: star.value, filled: false }),
						) ?? <Star className="so-rating__icon" />}
						<span className="so-rating__star-fill">
							{elevated(
								layer,
								renderSlot(props.icon, { value: star.value, filled: true }),
							) ?? <Star className="so-rating__icon" />}
						</span>
					</span>
				))}
				{/*
					Ручка — невидимая, во весь ряд: в ней поле, и кольцо фокуса тема
					рисует на ней — вокруг всего ряда.
				*/}
				<span className="so-rating__thumb">
					<NativeInput
						className="so-rating__input"
						type="range"
						min="0"
						max={max}
						step={step}
						id={id}
						name={name}
						disabled={disabled}
						{...toAriaProps(aria)}
						live={{ value }}
					/>
				</span>
			</span>
		</Tag>
	)
}
