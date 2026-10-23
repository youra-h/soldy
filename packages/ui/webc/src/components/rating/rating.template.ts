/**
 * Шаблон Rating: вложенность как у Vue — ручку и поле плагины находят только
 * прямыми детьми (`__thumb` в дорожке, `input` в ручке). Ячейки звёзд равные и
 * встык: доля дорожки по оси — доля шкалы. Значок слоя — копия образца `icon`
 * или голый `<svg>`, а не Icon: по две на звезду, оценок в списке — десятки.
 * Копия образца берёт номер звезды по её месту в дорожке, слой — по
 * `.so-rating__star-fill`.
 */

import type { IRating, TRatingStar } from '@soldy-ui/core'
import {
	TKeyedLoop,
	bind,
	ownerAttributes,
	ownerStyles,
	roleIcon,
	sampleOf,
	type ITemplate,
	type ITemplateContext,
} from '../../adapter'

/** Части оценки — одни на всё время жизни элемента. */
type TRatingParts = {
	readonly field: HTMLInputElement
	/** По номеру звезды: наведение и шаг клавишей не пересоздают узлы ряда. */
	readonly loop: TKeyedLoop<TRatingStar, number, HTMLElement>
}

const parts = new WeakMap<HTMLElement, TRatingParts>()

/** Значок слоя: копия образца `icon` или `<svg>` роли `star`. */
function iconOf(ctx: ITemplateContext<IRating>): Node {
	const copy = sampleOf(ctx, 'icon')

	if (copy) return copy

	const svg = roleIcon('star')

	svg.setAttribute('class', 'so-rating__icon')

	return svg
}

/** Звезда: пустой слой снизу, залитый — сверху, в обёртке, обрезанной по доле. */
function starOf(ctx: ITemplateContext<IRating>): HTMLElement {
	const { ownerDocument } = ctx.root
	const star = ownerDocument.createElement('span')
	const fill = ownerDocument.createElement('span')

	star.className = 'so-rating__star'
	star.setAttribute('aria-hidden', 'true')
	fill.className = 'so-rating__star-fill'
	fill.appendChild(iconOf(ctx))
	star.append(iconOf(ctx), fill)

	return star
}

export const ratingTemplate: ITemplate<IRating> = {
	create: (root) => {
		const { ownerDocument } = root
		const track = ownerDocument.createElement('span')
		const thumb = ownerDocument.createElement('span')
		const field = ownerDocument.createElement('input')

		track.className = 'so-rating__track'
		thumb.className = 'so-rating__thumb'
		field.className = 'so-rating__input'
		field.type = 'range'
		field.setAttribute('min', '0')
		thumb.appendChild(field)
		track.appendChild(thumb)
		root.appendChild(track)

		// Звёзды — перед ручкой
		parts.set(root, {
			field,
			loop: new TKeyedLoop(track, thumb, (star: TRatingStar) => star.value),
		})

		// Слот со scope — образец: копию шаблон кладёт в каждый слой звезды
		return { slots: { icon: { mode: 'sample' } } }
	},

	bindings: [
		bind('stars', (ctx) => {
			parts.get(ctx.root)?.loop.draw(
				ctx.state.stars ?? [],
				(entry) => {
					const star = starOf(ctx)

					ownerStyles(star, entry.style)

					return star
				},
				(star, entry) => ownerStyles(star, entry.style),
			)
		}),

		// Ход — раньше значения, значение — только разошедшееся с узлом
		bind(['max', 'step', 'value'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (!field) return

			if (state.max !== undefined) field.max = String(state.max)
			if (state.step !== undefined) field.step = String(state.step)

			const value = state.value === undefined ? undefined : String(state.value)

			if (value !== undefined && field.value !== value) field.value = value
		}),

		// Нативные атрибуты поля фиксированного тега — проводка разметки
		bind(['id', 'name', 'disabled'], ({ root, state }) => {
			const field = parts.get(root)?.field

			if (!field) return

			if (state.id === undefined) field.removeAttribute('id')
			else field.id = state.id

			if (state.name === undefined) field.removeAttribute('name')
			else field.name = state.name

			field.disabled = state.disabled === true
		}),

		bind('aria', ({ root, state }) => {
			const field = parts.get(root)?.field

			if (field) ownerAttributes(field, state.aria)
		}),
	],
}
