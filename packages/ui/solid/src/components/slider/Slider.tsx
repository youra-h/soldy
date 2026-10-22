import type { Accessor, JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import type { TSliderShownMark, TSliderThumb } from '@soldy-ui/core'
import {
	Elevate,
	createPartProps,
	createRootProps,
	fieldText,
	resolveSlot,
	rootTag,
} from '../../adapter'
import { Index, Show } from '../../adapter/runtime/flow'
import { setupSlider } from './setup.component'
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
 * на корне, клавиши и жест скринридера — плагин клавиатуры на полях. Ручку и
 * поле плагины находят по классам и только прямыми детьми: `__track` —
 * ребёнок корня, `__thumb` — дорожки, `input` — ручки; ни `Elevate`, ни
 * петли своих узлов не добавляют.
 *
 * На корне — набор корня (`rootAria`): у нескольких ручек корень — группа
 * полей с именем и описанием ползунка, от подписи поля формы `Field` тоже. У
 * одной ручки набор пуст: имя и описание — у её поля. Атрибуты потребителя —
 * корню: полей столько, сколько ручек.
 *
 * Ручки и метки — разметка, а не компоненты: потребитель их не адресует,
 * число ручек задаёт значение, число меток — шкала. Всё, что в них зависит от
 * значения, ядро отдаёт готовым: позиции — CSS-переменными в `style`,
 * состояния — наборами `data-*`. Эти выходы — новые записи на каждую смену, и
 * петля идёт по месту (`Index`), как `:key="index"` у Vue: ручка остаётся тем
 * же узлом, и фокус её поля переживает шаг клавишей.
 *
 * Значение поля пишет его `ref` (`fieldText`) — после хода поля и только
 * когда оно разошлось с узлом: значение, записанное раньше нового `max`,
 * браузер прижал бы к прежнему ходу.
 *
 * Слоты `mark` и `thumb` по запасному содержимому решают, что рисовать,
 * поэтому их разворачивает адаптер, один раз на место (`resolveSlot`).
 * Подсказка и её слот рисуются, только когда подсказка включена
 * (`tooltipRendered`). Поле формы `Field` над ползунком отдаёт ему ошибку,
 * `id` и ссылки на части, а своему содержимому ползунок опускает пустую
 * связку: содержимое — в слое лифта ползунка (`Elevate`), и слоты
 * разворачиваются там же.
 */
export function Slider(props: SliderProps): JSX.Element {
	const binding = setupSlider(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.rootAria, state.dataset],
		forward: binding.forwardProps(),
	}))

	/**
	 * Метка: позиция в `style` (`--so-slider-position`), состояния
	 * `data-in-range` и `data-current`. Подпись — слот `mark` со scope метки,
	 * по умолчанию — её `label`; без неё узел подписи пуст, и тема прячет его
	 * по `:empty`.
	 */
	function mark(entry: Accessor<TSliderShownMark>): JSX.Element {
		const dataset = createPartProps(() => entry().dataset)
		const label = resolveSlot(
			() => props.mark,
			() => ({ value: entry().value, label: entry().label }),
		)

		return (
			<span class="so-slider__mark" style={entry().style} {...dataset()}>
				<span class="so-slider__mark-label">{label() ?? entry().label}</span>
			</span>
		)
	}

	/**
	 * Подсказка со значением — внутри ручки, поэтому едет за ней сама. Под
	 * `aria-hidden`: значение объявляет поле, а в подписи `Label` текст
	 * подсказки вошёл бы в имя поля. Содержимое — слот `thumb` со scope ручки,
	 * по умолчанию — её значение.
	 */
	function tooltip(entry: Accessor<TSliderThumb>, index: number): JSX.Element {
		const content = resolveSlot(
			() => props.thumb,
			() => ({ value: entry().value, index }),
		)

		return (
			<span class="so-slider__tooltip" aria-hidden="true">
				{content() ?? entry().value}
			</span>
		)
	}

	/**
	 * Ручка — позиция в `style`, состояние `data-dragging` и нативное поле:
	 * мобильные скринридеры двигают его своим жестом, `name`, `disabled` и
	 * отправку формы даёт браузер, ARIA-дублей ему нет. Ход поля — соседи и
	 * зазор, шаг — шкалы (`any` у списка). Набор поля ядро отдаёт целиком
	 * (`aria` ручки): имя ручки из `thumbLabels` в нём уже сильнее имени
	 * ползунка. Тема делает поле прозрачным во всю ручку и не пускает к нему
	 * указатель: тянет плагин, а не браузер.
	 */
	function thumb(entry: Accessor<TSliderThumb>, index: number): JSX.Element {
		const dataset = createPartProps(() => entry().dataset)
		const aria = createPartProps(() => entry().aria)
		const value = fieldText(() => String(entry().value))

		return (
			<span class="so-slider__thumb" style={entry().style} {...dataset()}>
				<input
					class="so-slider__input"
					type="range"
					min={entry().min}
					max={entry().max}
					step={entry().step}
					name={state.name}
					disabled={state.disabled}
					{...aria()}
					{...value}
				/>
				<Show when={state.tooltipRendered}>{tooltip(entry, index)}</Show>
			</span>
		)
	}

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Elevate layer={binding.layer}>
					{/*
						Дорожка — ход центров ручек: 0 % и 100 % значения — края её
						коробки по оси, её мерит плагин указателя. Рельс рисует тема
						псевдоэлементом, своего узла у него нет.
					*/}
					<span class="so-slider__track">
						{/*
							Заливка — одна на ползунок: от начала или от `origin` до
							ручки, у нескольких ручек — между крайними. Края приходят
							переменными (`--so-slider-range-start`, `--so-slider-range-end`).
						*/}
						<span class="so-slider__range" style={state.rangeStyle} />
						{/*
							Метки — только если они заданы. Блок — под `aria-hidden`, как
							подсказка: подписи меток — зрительная шкала, значение и
							границы объявляет поле.
						*/}
						<Show when={(state.shownMarks?.length ?? 0) > 0}>
							<span class="so-slider__marks" aria-hidden="true">
								<Index each={state.shownMarks}>{mark}</Index>
							</span>
						</Show>
						<Index each={state.thumbs}>{thumb}</Index>
					</span>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
