/**
 * Шаблон Rating.
 *
 * Корень — сам `<span is="so-rating">`: классы (размер, вариант и только
 * чтение — `--size-*`, `--variant-*`, `--readonly`), `attrs` (`dir`),
 * `dataset` (`data-disabled`) и скрытие раскладывает на него база
 * (`ElementBase`). Здесь — то же, что в разметке Vue, теми же классами и той
 * же вложенностью: ручку и поле плагины находят только прямыми детьми, как у
 * Slider, — `__thumb` в дорожке, `input` в ручке. Обработчиков нет: нажатие
 * ловит плагин указателя на корне, наведение — плагин наведения там же,
 * клавиши и жест скринридера — плагин клавиатуры на поле. Всё внутри —
 * `span`: оценку кладут в подпись `Label`.
 *
 * - Дорожка `span.so-rating__track` — ряд звёзд. Ячейки равные и встык,
 *   поэтому доля её коробки по оси — доля шкалы: точку указателя в значение
 *   плагины переводят по дорожке, не зная о звёздах.
 * - Звезда `span.so-rating__star` — по одной на единицу шкалы, под
 *   `aria-hidden`: значение объявляет поле. Доля заливки — в её стиле
 *   (`--so-rating-fraction`, число от 0 до 1). Слоёв два: пустая звезда снизу
 *   и залитая сверху, в слое `span.so-rating__star-fill`, обрезанном по доле.
 *   Значок каждого слоя — копия образца `icon` или `<svg>` роли `star`
 *   (`roleIcon`) с классом `so-rating__icon`, а не элемент Icon, как отметка
 *   CheckBox: иконок по две на звезду, а оценок в списке отзывов — десятки.
 * - Ручка `span.so-rating__thumb` — невидимая, во весь ряд, за звёздами: в ней
 *   поле, и кольцо фокуса тема рисует на ней.
 * - Поле `input.so-rating__input` — нативный `range`: ход от 0 до `max`, шаг
 *   оценки, значение, нативные `id`, `name` и `disabled` и набор `aria` (имя,
 *   `aria-valuetext` — «4 из 5» — и `aria-readonly`: `readonly` поле не
 *   знает). Ход пишется раньше значения, а значение — только разошедшееся с
 *   узлом, как у Slider.
 *
 * Звёзды — новые записи на каждую смену, а петля идёт по номеру звезды
 * (`TKeyedLoop` с ключом `value`), как `:key="star.value"` у Vue: предпросмотр
 * наведением и шаг клавишей не пересоздают узлы ряда. Долю заливки на звезду
 * кладёт `ownerStyles`: чужое на узле он не трогает.
 *
 * Слот со scope (`icon`) у Web Components — образец (`<template slot="icon">`):
 * копию получает каждый слой каждой звезды, одну на всё время жизни звезды.
 * Данные копия берёт по месту: номер звезды — место её `.so-rating__star`
 * среди звёзд дорожки (с единицы), слой — внутри ли она
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
	/** Петля звёзд в дорожке, перед ручкой, — по номеру звезды. */
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
