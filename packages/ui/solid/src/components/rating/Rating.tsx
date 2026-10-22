import { Index, Show, type Accessor, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TRatingStar } from '@soldy-ui/core'
import {
	Elevate,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	roleIcon,
	rootTag,
} from '../../adapter'
import { setupRating } from './setup.component'
import type { RatingProps } from './base.component'

/** Значок звезды без слота — иконка роли `star`, компонент на роль один на модуль. */
const STAR = roleIcon('star')

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
 * жест скринридера — плагин клавиатуры на поле. Атрибуты потребителя — корню,
 * как у Slider: указатель поле не ловит.
 *
 * Дорожка — ряд звёзд. Ячейки равные и встык, поэтому доля её коробки по оси
 * — доля шкалы: точку указателя в значение переводят по дорожке, не зная о
 * звёздах. Ручку и поле плагины находят по классам и только прямыми детьми,
 * как у Slider: `__thumb` — ребёнок дорожки, `input` — ребёнок ручки.
 *
 * Звезда — по одной на единицу шкалы, под `aria-hidden`: значение объявляет
 * поле. Доля заливки — в `style` звезды (`--so-rating-fraction`). Слоёв два,
 * оба — одна иконка: пустая звезда снизу и залитая сверху, в слое, обрезанном
 * по доле. Звёзды — новые записи на каждую смену, и петля идёт по месту
 * (`Index`): номер звезды — её место, как `:key="star.value"` у Vue, и
 * наведение не пересоздаёт узлы ряда.
 *
 * Иконка — `svg` роли `star`, а не компонент Icon, как отметка CheckBox:
 * иконок по две на звезду, а оценок в списке отзывов — десятки. Размер и цвет
 * ей даёт тема по слою. Слот `icon` заменяет иконку в обоих слоях; какой слой
 * он рисует, говорит `filled`, какую звезду — `value`. По слоту разметка
 * выбирает, что рисовать, поэтому его разворачивает адаптер, один раз на слой
 * (`resolveSlot`).
 *
 * Поле — нативный `range`, как у Slider: мобильный скринридер двигает его
 * своим жестом, `name`, `disabled` и отправку формы даёт браузер. Ход — от 0
 * до `max`, шаг — оценки, имя и `aria-valuetext` («4 из 5») — из набора
 * `aria`, там же `aria-readonly`: `readonly` поле не знает. Значение пишет
 * `ref` поля (`fieldText`) — после хода и только когда оно разошлось с узлом.
 *
 * Поле формы `Field` над оценкой отдаёт ей ошибку, `id` и ссылки на части, а
 * своему содержимому оценка опускает пустую связку: содержимое — в слое лифта
 * оценки (`Elevate`), и слот значка разворачивается там же.
 */
export function Rating(props: RatingProps): JSX.Element {
	const binding = setupRating(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.dataset],
		forward: binding.forwardProps(),
	}))
	// Полю — его `aria`: имя, `aria-valuetext`, `aria-readonly`
	const aria = createPartProps(() => state.aria)
	const value = fieldText(() => (state.value === undefined ? undefined : String(state.value)))

	/** Значок одного слоя звезды: слот `icon` со scope звезды и слоя или иконка роли `star`. */
	function icon(star: Accessor<TRatingStar>, filled: boolean): JSX.Element {
		const content = resolveSlot(
			() => props.icon,
			() => ({ value: star().value, filled }),
		)

		return <>{content() ?? <STAR class="so-rating__icon" />}</>
	}

	/** Звезда: пустой слой снизу, залитый — сверху, в обёртке, обрезанной по доле. */
	function star(entry: Accessor<TRatingStar>): JSX.Element {
		return (
			<span class="so-rating__star" style={entry().style} aria-hidden="true">
				{icon(entry, false)}
				<span class="so-rating__star-fill">{icon(entry, true)}</span>
			</span>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					<span class="so-rating__track">
						<Index each={state.stars}>{star}</Index>
						{/*
							Ручка — невидимая, во весь ряд: в ней поле, и кольцо фокуса
							тема рисует на ней — вокруг всего ряда. Тема делает поле
							прозрачным во всю ручку и не пускает к нему указатель:
							оценку ставит плагин, а не браузер.
						*/}
						<span class="so-rating__thumb">
							<input
								class="so-rating__input"
								type="range"
								min="0"
								max={state.max}
								step={state.step}
								id={state.id}
								name={state.name}
								disabled={state.disabled}
								{...aria()}
								{...value}
							/>
						</span>
					</span>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
