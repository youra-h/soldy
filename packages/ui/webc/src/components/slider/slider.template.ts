/**
 * Шаблон Slider: дорожка с заливкой, блоком меток и ручками, поле `range` в
 * каждой ручке. Части плагины находят только прямыми детьми; всё — `span`, как
 * требует подпись `Label`. docs/architecture.md, Layer 8d, «Поле».
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

/**
 * Ключ петли — номер: записи `thumbs` и `shownMarks` новые на каждую смену, а
 * ручка должна остаться тем же узлом, иначе фокус поля не переживёт шаг клавишей.
 */
type TPlaced<T> = {
	readonly entry: T
	readonly index: number
}

type TSliderParts = {
	readonly track: HTMLElement
	readonly range: HTMLElement
	readonly marks: HTMLElement
	readonly markLoop: TKeyedLoop<TPlaced<TSliderShownMark>, number, HTMLElement>
	readonly thumbLoop: TKeyedLoop<TPlaced<TSliderThumb>, number, HTMLElement>
}

type TSliderContext = ITemplateContext<ISlider>

const parts = new WeakMap<HTMLElement, TSliderParts>()

const labels = new WeakMap<HTMLElement, HTMLElement>()

const fields = new WeakMap<HTMLElement, HTMLInputElement>()

const tooltips = new WeakMap<HTMLElement, HTMLElement>()

/** Узлы с копией образца: своё они не пишут. */
const sampled = new WeakSet<HTMLElement>()

function placed<T>(entries: readonly T[] | undefined): TPlaced<T>[] {
	return (entries ?? []).map((entry, index) => ({ entry, index }))
}

function fillFrom(ctx: TSliderContext, node: HTMLElement, slot: string): void {
	const copy = sampleOf(ctx, slot)

	if (!copy) return

	node.appendChild(copy)
	sampled.add(node)
}

function writeText(node: HTMLElement, text: string): void {
	if (!sampled.has(node) && node.textContent !== text) node.textContent = text
}

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

function applyMark(mark: HTMLElement, entry: TSliderShownMark): void {
	const label = labels.get(mark)

	ownerStyles(mark, entry.style)
	ownerAttributes(mark, entry.dataset)

	if (label) writeText(label, entry.label ?? '')
}

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

/** Под `aria-hidden`: значение объявляет поле, а в подписи `Label` текст вошёл бы в его имя. */
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

/** Ход раньше значения: записанное до нового `max`, оно встало бы на прежний край. */
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
		// Шкала зрительная: значение и границы объявляет поле
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

			// За заливкой, перед ручками
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
