/**
 * Шаблон Slider.
 *
 * Корень — сам `<span is="so-slider">`: классы (ориентация, режим подсказки,
 * размер и вариант — `--horizontal` и `--vertical`, `--tooltip-*`,
 * `--size-*`, `--variant-*`), `attrs` (`dir`), `dataset` (`data-disabled`,
 * `data-dragging`), набор корня `rootAria` и скрытие раскладывает на него база
 * (`ElementBase`). Здесь — то же, что в разметке Vue, теми же классами и той
 * же вложенностью: части плагины находят только прямыми детьми — дорожку в
 * корне, ручки в дорожке, поле в ручке. Обработчиков нет: нажатия и протяжку
 * ловит плагин указателя на корне, клавиши и жест скринридера — плагин
 * клавиатуры на полях. Всё внутри — `span`: ползунок кладут в подпись
 * `Label`, а внутри `label` HTML разрешает только строчную разметку.
 *
 * - Дорожка `span.so-slider__track` — ход центров ручек: 0 % и 100 % значения
 *   — края её коробки, её мерит плагин указателя. Рельс рисует тема
 *   псевдоэлементом.
 * - Заливка `span.so-slider__range` — одна на ползунок, края переменными
 *   (`rangeStyle`).
 * - Метки — блок `span.so-slider__marks` под `aria-hidden`, только пока метки
 *   есть (`shownMarks`): подписи меток — зрительная шкала, значение и границы
 *   объявляет поле, а в подписи `Label` их текст вошёл бы в имя поля. Метка
 *   `span.so-slider__mark` — позиция в стиле, `data-in-range` и
 *   `data-current`; в ней подпись `span.so-slider__mark-label` — `label`
 *   метки или копия образца `mark`. Пустую подпись тема прячет по `:empty`.
 * - Ручка `span.so-slider__thumb` — по одной на значение: позиция в стиле и
 *   `data-dragging`. В ней поле `input.so-slider__input` и, пока подсказку
 *   рисуют (`tooltipRendered`), подсказка `span.so-slider__tooltip` под
 *   `aria-hidden` сразу за полем — значение ручки или копия образца `thumb`:
 *   значение объявляет поле, а в подписи `Label` текст подсказки вошёл бы в
 *   имя поля. Дитя ручки едет за ней само.
 *
 * Поле ручки — нативный `range`: ход и шаг ручки (`min`, `max`, `step` —
 * `any` у шага списком), значение, `name` и `disabled` ползунка и набор поля
 * целиком (`thumb.aria`): у одной ручки — весь `aria` ползунка, у нескольких —
 * ориентация, ошибка и имя ручки из `thumbLabels`. Ход пишется раньше
 * значения, а значение — только разошедшееся с узлом: записанное раньше
 * нового `max`, оно встало бы на прежний край.
 *
 * Выходы `thumbs` и `shownMarks` — новые записи на каждую смену, поэтому петли
 * ручек и меток идут по месту (`TKeyedLoop` с ключом-номером), как
 * `:key="index"` у Vue: ручка остаётся тем же узлом, и фокус её поля
 * переживает шаг клавишей. Стиль значением на узлах — позиции ручек и меток и
 * края заливки — кладёт `ownerStyles`, наборы ручки, метки и поля —
 * `ownerAttributes`: чужое на узле они не трогают.
 *
 * Слоты со scope (`mark`, `thumb`) у Web Components — образцы
 * (`<template slot="thumb">`): копию получает каждая метка и подсказка каждой
 * ручки, одну на всё время жизни узла. Данные копия берёт у элемента по месту
 * своего узла: метка — по номеру среди `.so-slider__mark` блока в
 * `el.state.shownMarks`, ручка — по номеру среди `.so-slider__thumb` дорожки в
 * `el.state.thumbs`.
 */

import type { ISlider, TSliderShownMark, TSliderThumb } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	ownerAttributes,
	ownerStyles,
	sampleOf,
	type ITemplate,
	type ITemplateContext,
	patch,
} from '../../adapter'

/** Запись петли по месту: запись выхода и её номер — ключ записи. */
type TPlaced<T> = {
	readonly entry: T
	readonly index: number
}

/** Части ползунка — одни на всё время жизни элемента. */
type TSliderParts = {
	readonly track: HTMLElement
	readonly range: HTMLElement
	/** Блок меток — в дорожке за заливкой, пока метки есть. */
	readonly marks: HTMLElement
	/** Петля меток в их блоке — по месту. */
	readonly markLoop: TKeyedLoop<TPlaced<TSliderShownMark>, number, HTMLElement>
	/** Петля ручек в дорожке — по месту. */
	readonly thumbLoop: TKeyedLoop<TPlaced<TSliderThumb>, number, HTMLElement>
}

/** Контекст привязок ползунка. */
type TSliderContext = ITemplateContext<ISlider>

const parts = new WeakMap<HTMLElement, TSliderParts>()

/** Подпись каждой метки. */
const labels = new WeakMap<HTMLElement, HTMLElement>()

/** Поле каждой ручки. */
const fields = new WeakMap<HTMLElement, HTMLInputElement>()

/** Подсказка каждой ручки — строится, когда впервые нужна, и остаётся за ручкой. */
const tooltips = new WeakMap<HTMLElement, HTMLElement>()

/** Узлы — подпись или подсказка, — в которые легла копия образца: своё они не пишут. */
const sampled = new WeakSet<HTMLElement>()

/** Записи петли по месту: номер записи — её ключ. */
function placed<T>(entries: readonly T[] | undefined): TPlaced<T>[] {
	return (entries ?? []).map((entry, index) => ({ entry, index }))
}

/** Копия образца `slot` — в узел; образца нет — узел пишет своё. */
function fillFrom(ctx: TSliderContext, node: HTMLElement, slot: string): void {
	const copy = sampleOf(ctx, slot)

	if (!copy) return

	node.appendChild(copy)
	sampled.add(node)
}

/** Текст узла — только если узел пишет своё и текст разошёлся с ним. */
function writeText(node: HTMLElement, text: string): void {
	if (!sampled.has(node) && node.textContent !== text) node.textContent = text
}

/** Метка: подпись — копия образца `mark` или текст метки (`applyMark`). */
function markOf(ctx: TSliderContext): HTMLElement {
	const { ownerDocument } = ctx.root
	const mark = ownerDocument.createElement('span')
	const label = ownerDocument.createElement('span')

	mark.className = 'so-slider__mark'
	label.className = 'so-slider__mark-label'
	fillFrom(ctx, label, 'mark')
	mark.appendChild(label)
	labels.set(mark, label)

	return mark
}

/** Метке — её запись: позиция, состояния и подпись. */
function applyMark(mark: HTMLElement, entry: TSliderShownMark): void {
	const label = labels.get(mark)

	ownerStyles(mark, entry.style)
	ownerAttributes(mark, entry.dataset)

	if (label) writeText(label, entry.label ?? '')
}

/** Ручка и поле в ней. */
function thumbOf(ctx: TSliderContext): HTMLElement {
	const { ownerDocument } = ctx.root
	const thumb = ownerDocument.createElement('span')
	const field = ownerDocument.createElement('input')

	thumb.className = 'so-slider__thumb'
	field.className = 'so-slider__input'
	field.type = 'range'
	thumb.appendChild(field)
	fields.set(thumb, field)

	return thumb
}

/** Подсказка ручки: копия образца `thumb` или значение ручки (`applyThumb`). */
function tooltipOf(ctx: TSliderContext, thumb: HTMLElement): HTMLElement {
	const known = tooltips.get(thumb)

	if (known) return known

	const tooltip = ctx.root.ownerDocument.createElement('span')

	tooltip.className = 'so-slider__tooltip'
	tooltip.setAttribute('aria-hidden', 'true')
	fillFrom(ctx, tooltip, 'thumb')
	tooltips.set(thumb, tooltip)

	return tooltip
}

/**
 * Поле ручки — по её записи: ход и шаг раньше значения, значение — только
 * разошедшееся с узлом (см. шапку).
 */
function applyField(ctx: TSliderContext, field: HTMLInputElement, entry: TSliderThumb): void {
	const { state } = ctx
	const value = String(entry.value)

	field.min = String(entry.min)
	field.max = String(entry.max)
	field.step = String(entry.step)

	patch(field, { value })

	if (state.name === undefined) field.removeAttribute('name')
	else field.name = state.name

	field.disabled = state.disabled === true
	ownerAttributes(field, entry.aria)
}

/** Ручке — её запись: позиция, состояние, поле и подсказка. */
function applyThumb(ctx: TSliderContext, thumb: HTMLElement, entry: TSliderThumb): void {
	const field = fields.get(thumb)

	ownerStyles(thumb, entry.style)
	ownerAttributes(thumb, entry.dataset)

	if (field) applyField(ctx, field, entry)

	if (ctx.state.tooltipRendered !== true) {
		tooltips.get(thumb)?.remove()

		return
	}

	const tooltip = tooltipOf(ctx, thumb)

	writeText(tooltip, String(entry.value))

	// Сразу за полем, последним в ручке
	if (tooltip.parentNode !== thumb) thumb.appendChild(tooltip)
}

export const sliderTemplate: ITemplate<ISlider> = {
	create: (root) => {
		const { ownerDocument } = root
		const track = ownerDocument.createElement('span')
		const range = ownerDocument.createElement('span')
		const marks = ownerDocument.createElement('span')

		track.className = 'so-slider__track'
		range.className = 'so-slider__range'
		marks.className = 'so-slider__marks'
		marks.setAttribute('aria-hidden', 'true')
		track.appendChild(range)
		root.appendChild(track)

		parts.set(root, {
			track,
			range,
			marks,
			markLoop: new TKeyedLoop(marks, null, (mark: TPlaced<TSliderShownMark>) => mark.index),
			// Ручки — в конце дорожки, за заливкой и блоком меток
			thumbLoop: new TKeyedLoop(track, null, (thumb: TPlaced<TSliderThumb>) => thumb.index),
		})

		// Слоты со scope — образцы: копию шаблон кладёт в каждую метку и подсказку
		return {
			slots: {
				mark: { mode: 'sample' },
				thumb: { mode: 'sample' },
			},
		}
	},

	bindings: [
		bind('rangeStyle', ({ root, state }) => {
			const range = parts.get(root)?.range

			if (range) ownerStyles(range, state.rangeStyle)
		}),

		bind('shownMarks', (ctx) => {
			const own = parts.get(ctx.root)

			if (!own) return

			const shown = placed(ctx.state.shownMarks)

			own.markLoop.draw(
				shown,
				({ entry }) => {
					const mark = markOf(ctx)

					applyMark(mark, entry)

					return mark
				},
				(mark, { entry }) => applyMark(mark, entry),
			)

			// Блок — только пока метки есть: за заливкой, перед ручками
			if (shown.length === 0) {
				own.marks.remove()
			} else if (own.marks.parentNode !== own.track) {
				own.range.after(own.marks)
			}
		}),

		bind(['thumbs', 'name', 'disabled', 'tooltipRendered'], (ctx) => {
			parts.get(ctx.root)?.thumbLoop.draw(
				placed(ctx.state.thumbs),
				({ entry }) => {
					const thumb = thumbOf(ctx)

					applyThumb(ctx, thumb, entry)

					return thumb
				},
				(thumb, { entry }) => applyThumb(ctx, thumb, entry),
			)
		}),
	],
}
