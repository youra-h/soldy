/**
 * Превью Field на самой странице стенда: строка `position` меняет сторону
 * подписи в обеих колонках.
 *
 * Тест поля (`field.spec.ts`) монтирует Field в свой контейнер. На странице
 * превью стоит в ячейке колонки (`.pg-col__stage` — флекс-ряд с переносом), и
 * значение доходит до него своей дорогой: в колонке пропов — разметкой через
 * хост фреймворка, в колонке экземпляра — записью в `ctrl`. Поэтому значение
 * выбирается контролом строки, как это делает человек, и после каждого выбора
 * проверяются обе колонки: модификатор стороны на корне поля — один, без
 * прежнего, — и место подписи рядом с контролом.
 *
 * Окна те же, что у превью Tags (`tags-preview.spec.ts`): шире 768 px колонки
 * строки стоят рядом, уже — одна под другой во всю ширину.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import type { TFieldPosition } from '@soldy-ui/core'
import { router } from '../src/router'
import { renderStand } from './stand'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
useTheme(oren)

const WINDOWS = [
	{ width: 900, columns: 2 },
	{ width: 375, columns: 1 },
]

const HEIGHT = 800

/** Колонки строки по порядку: первая правится пропами, вторая — экземпляром. */
const COLUMNS = ['props', 'instance'] as const

/** Стороны по порядку выбора: от умолчания вбок, на другой бок и обратно наверх. */
const PICKS: readonly TFieldPosition[] = ['start', 'end', 'top']

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Строка страницы по имени пропа. */
const propRow = (name: string): HTMLElement => {
	const rows = [...document.querySelectorAll('.pg-prop')]
	const found = rows.find(
		(node) => node.querySelector('.pg-prop__name')?.textContent?.trim() === name,
	)

	if (!(found instanceof HTMLElement)) {
		throw new Error(`строки «${name}» нет; строк всего ${rows.length}`)
	}

	return found
}

/** Выбрать значение в контроле строки — так же, как это делает человек. */
const pick = async (row: HTMLElement, value: string) => {
	const trigger = row.querySelector('.pg-prop__head > .so-field__control .so-select')

	if (!(trigger instanceof HTMLElement)) throw new Error('контрола-селекта в строке нет')

	await userEvent.click(trigger)
	await settle()

	const option = [...document.querySelectorAll('[role="option"]')].find(
		(node) => node.textContent?.trim() === value,
	)

	if (!(option instanceof HTMLElement)) throw new Error(`опции «${value}» нет`)

	await userEvent.click(option)
	await settle()
}

/**
 * Колонок в ряду строки. Колонки рядом начинаются в разных местах по
 * горизонтали, одна под другой — в одном.
 */
const columnsOf = (prop: HTMLElement) =>
	new Set(
		[...prop.querySelectorAll('.pg-prop__columns > .pg-col')].map((column) =>
			Math.round(column.getBoundingClientRect().left),
		),
	).size

/** Корень поля в колонке строки. */
const fieldOf = (prop: HTMLElement, column: (typeof COLUMNS)[number]): HTMLElement => {
	const field = prop
		.querySelectorAll('.pg-prop__columns > .pg-col')
		[COLUMNS.indexOf(column)]?.querySelector('.so-field')

	if (!(field instanceof HTMLElement)) throw new Error(`поля в колонке ${column} нет`)

	return field
}

/** Прямоугольник части поля — её прямого ребёнка. */
const partOf = (field: HTMLElement, part: 'label' | 'control'): DOMRect => {
	const node = field.querySelector(`:scope > .so-field__${part}`)

	if (!node) throw new Error(`части ${part} в поле нет`)

	return node.getBoundingClientRect()
}

/** Модификаторы стороны на корне поля. */
const sidesOf = (field: HTMLElement) =>
	[...field.classList].filter((name) => name.startsWith('so-field--position-'))

/** Подпись и контрол в одном ряду: их коробки перекрываются по вертикали. */
const sameRow = (label: DOMRect, control: DOMRect) =>
	label.top < control.bottom && control.top < label.bottom

/** Сторона подписи в обеих колонках строки — по модификатору и по месту. */
function expectSide(prop: HTMLElement, side: TFieldPosition): void {
	for (const column of COLUMNS) {
		const field = fieldOf(prop, column)
		const where = `${side}, колонка ${column}`

		expect(sidesOf(field), `${where}: модификатор`).toEqual([`so-field--position-${side}`])

		const label = partOf(field, 'label')
		const control = partOf(field, 'control')

		if (side === 'top') {
			expect(label.bottom, `${where}: подпись над контролом`).toBeLessThanOrEqual(
				control.top + 0.5,
			)

			continue
		}

		expect(sameRow(label, control), `${where}: подпись в ряду контрола`).toBe(true)

		if (side === 'start') {
			expect(label.right, `${where}: подпись левее`).toBeLessThanOrEqual(control.left + 0.5)
		} else {
			expect(label.left, `${where}: подпись правее`).toBeGreaterThanOrEqual(
				control.right - 0.5,
			)
		}
	}
}

describe('строка position на странице компонента', () => {
	describe.each(WINDOWS)('окно $width px', ({ width, columns }) => {
		let prop: HTMLElement

		beforeEach(async () => {
			document.documentElement.dataset.soTheme = 'oren'

			await page.viewport(width, HEIGHT)
			await router.push('/vue/field')

			renderStand()

			await settle()

			prop = propRow('position')

			prop.scrollIntoView()

			// Раскладка — та, ради которой взято окно, иначе тест мерил бы другую
			expect(columnsOf(prop), 'колонок в строке').toBe(columns)
		})

		it('сторона подписи следует за выбором в обеих колонках', async () => {
			// До выбора — умолчание: подпись над контролом
			expectSide(prop, 'top')

			for (const side of PICKS) {
				await pick(prop, side)

				expectSide(prop, side)
			}
		})
	})
})
