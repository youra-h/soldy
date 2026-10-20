import type { ElementType, ReactElement } from 'react'
import {
	NativeInput,
	elevated,
	renderSlot,
	toAriaProps,
	toReactStyle,
	toRootProps,
} from '../../adapter'
import { useSetupSlider } from './setup.component'
import type { SliderProps } from './base.component'

/**
 * Slider — ползунок: ручки на рельсе, заливка и метки. Корень рисуется по
 * `tag`, по умолчанию `span`: ползунок кладут в подпись `Label`, а внутри
 * `label` HTML разрешает только строчную разметку. Поэтому и всё внутри —
 * `span`.
 *
 * Ориентация, режим подсказки, размер и вариант приходят классами
 * (`--horizontal` / `--vertical`, `--tooltip-*`, `--size-*`, `--variant-*`),
 * состояния — набором `dataset` (`data-disabled`, `data-dragging`), `dir` — в
 * `attrs`. Обработчиков здесь нет: нажатия и протяжку ловит плагин указателя
 * на корне, клавиши и жест скринридера — плагин клавиатуры на полях.
 *
 * На корне — набор корня (`rootAria`): у нескольких ручек корень — группа
 * полей с именем и описанием ползунка, от подписи поля формы `Field` тоже. У
 * одной ручки набор пуст: имя и описание — у её поля. Атрибуты потребителя —
 * корню, как у Vue: полей столько, сколько ручек.
 *
 * Ручки и метки — разметка, а не компоненты: потребитель их не адресует, число
 * ручек задаёт значение, число меток — шкала. Всё, что в них зависит от
 * значения, ядро отдаёт готовым: позиции — CSS-переменными в стиле, состояния
 * — наборами `data-*`. Ключ ручки и метки — номер по порядку, как у Vue: ручка
 * — место в значении, и её поле с фокусом при смене значения не
 * пересоздаётся.
 *
 * Дорожка — ход центров ручек: 0 % и 100 % значения — края её коробки по оси,
 * её мерит плагин указателя. Рельс рисует тема псевдоэлементом, своего узла у
 * него нет. Заливка — одна на ползунок: от начала или от `origin` до ручки, у
 * нескольких ручек — между крайними.
 *
 * Поле ручки — нативный `input[type="range"]`: мобильные скринридеры двигают
 * его своим жестом, `name`, `disabled` и отправку формы даёт браузер. Значение
 * поля ведёт ядро (`NativeInput`), набор поля ядро отдаёт целиком
 * (`thumb.aria`): имя, описание, ориентацию, ошибку и `id` от поля формы.
 *
 * Поле формы `Field` над ползунком отдаёт ему ошибку, `id` и ссылки на части
 * (`TFieldControlExtension`), а своему содержимому ползунок опускает пустую
 * связку. Поэтому содержимое слотов меток и подсказок — в слое лифта
 * ползунка (`elevated`).
 */
export function Slider(props: SliderProps): ReactElement | null {
	const { ref, forwardProps, state, layer } = useSetupSlider(props)

	const {
		rendered,
		tag,
		attrs,
		rootAria,
		dataset,
		name,
		disabled,
		thumbs,
		shownMarks,
		rangeStyle,
		tooltipRendered,
	} = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Корню — его наборы и атрибуты потребителя; `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, rootAria, dataset], forwardProps)}>
			<span className="so-slider__track">
				<span className="so-slider__range" style={toReactStyle(rangeStyle)} />

				{/*
					Метки — только если они заданы: точками шкалы или списком. Блок —
					под `aria-hidden`, как подсказка: подписи меток — зрительная шкала,
					значение и границы объявляет поле, а в подписи `Label` их текст
					вошёл бы в имя поля. Подпись — слот `mark` со scope метки, по
					умолчанию — её `label`; пустую подпись тема прячет по `:empty`.
				*/}
				{shownMarks && shownMarks.length > 0 ? (
					<span className="so-slider__marks" aria-hidden="true">
						{shownMarks.map((mark, index) => (
							<span
								key={index}
								className="so-slider__mark"
								style={toReactStyle(mark.style)}
								{...toAriaProps(mark.dataset)}
							>
								<span className="so-slider__mark-label">
									{elevated(
										layer,
										renderSlot(props.mark, {
											value: mark.value,
											label: mark.label,
										}),
									) ?? mark.label}
								</span>
							</span>
						))}
					</span>
				) : null}

				{thumbs?.map((thumb, index) => (
					<span
						key={index}
						className="so-slider__thumb"
						style={toReactStyle(thumb.style)}
						{...toAriaProps(thumb.dataset)}
					>
						<NativeInput
							className="so-slider__input"
							type="range"
							min={thumb.min}
							max={thumb.max}
							step={thumb.step}
							name={name}
							disabled={disabled}
							{...toAriaProps(thumb.aria)}
							live={{ value: thumb.value }}
						/>
						{/*
							Подсказка со значением — только когда она включена
							(`tooltip`): рисовать ли, решает ядро (`tooltipRendered`),
							когда показывать в `auto` — тема. Под `aria-hidden`: значение
							объявляет поле. Содержимое — слот `thumb` со scope ручки, по
							умолчанию — её значение.
						*/}
						{tooltipRendered ? (
							<span className="so-slider__tooltip" aria-hidden="true">
								{elevated(
									layer,
									renderSlot(props.thumb, { value: thumb.value, index }),
								) ?? thumb.value}
							</span>
						) : null}
					</span>
				))}
			</span>
		</Tag>
	)
}
