/**
 * Превью Tags на самой странице стенда, а не на самодельном стенде.
 *
 * Здесь сторожится то, чего не видит ни один тест компонента: превью живёт в
 * ячейке страницы, ячейка — флексбокс, и у флекс-элемента автоминимум равен
 * его содержимому. Ряд тегов из-за этого держал свою ширину в узкой колонке:
 * теги уходили за край, и `overflow` не срабатывал вовсе — прокрутки в
 * `scroll` не было. Проверить это можно только на настоящей странице: в
 * самодельном контейнере такой ячейки нет.
 *
 * Ширину задаёт окно (`page.viewport`), а не `body`: колонки страницы
 * считаются от окна. В узком правило `@media` в `src/styles.css` ставит
 * колонки строки одну под другой, а `useSidebar` уводит меню в выезжающую
 * панель. Окно прогона по умолчанию (414 px) узкое, и с шириной `body` тест
 * мерил одну колонку во всю страницу, куда теги помещались. Поэтому каждый
 * случай идёт в двух окнах, по одному на раскладку, и раскладку тест сверяет
 * сам.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

useIcons(material)
useTheme(oren)

/**
 * Окна, в которых теги в колонку не помещаются: шире 768 px колонки строки
 * стоят рядом, справа от меню, уже — одна под другой во всю ширину.
 */
const WINDOWS = [
	{ width: 900, columns: 2 },
	{ width: 375, columns: 1 },
]

const HEIGHT = 800

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

/** Ряд тегов первой колонки строки — той, что правится пропами. */
const rowOf = (prop: HTMLElement): HTMLElement => {
	const element = prop.querySelector('.pg-col .so-tags')

	if (!(element instanceof HTMLElement)) throw new Error('ряда тегов в колонке нет')

	return element
}

/**
 * Ячейка строки — сцена колонки, а не обёртка превью: именно с ней ряд и
 * расходился. Сравнение с обёрткой сходится всегда, что бы ни случилось, —
 * ряд её ребёнок и растёт вместе с ней.
 */
const stageOf = (prop: HTMLElement): DOMRect => {
	const stage = prop.querySelector('.pg-col .pg-col__stage')

	if (!stage) throw new Error('сцены колонки нет')

	return stage.getBoundingClientRect()
}

/** Правый край содержимого ряда: по нему видно, вылез он из ячейки или нет. */
const contentEdge = (row: HTMLElement) =>
	[...row.children].reduce((max, node) => Math.max(max, node.getBoundingClientRect().right), 0)

describe('строка overflow на странице компонента', () => {
	describe.each(WINDOWS)('окно $width px', ({ width, columns }) => {
		let prop: HTMLElement

		beforeEach(async () => {
			document.documentElement.dataset.soTheme = 'oren'

			await page.viewport(width, HEIGHT)
			await router.push('/vue/tags')

			render(App, { global: { plugins: [router] } })

			await settle()

			prop = propRow('overflow')

			prop.scrollIntoView()

			// Раскладка — та, ради которой взято окно, иначе тест мерил бы другую
			expect(columnsOf(prop), 'колонок в строке').toBe(columns)
		})

		it('scroll: ряд прокручивается внутри ячейки, а не выходит за неё', async () => {
			await pick(prop, 'scroll')

			const row = rowOf(prop)

			// Прокручивать есть что, и прокрутка — у самого ряда
			expect(row.scrollWidth).toBeGreaterThan(row.clientWidth)
			expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(stageOf(prop).right + 0.5)
		})

		it('wrap: ряд переносится строками и тоже остаётся в ячейке', async () => {
			await pick(prop, 'wrap')

			const row = rowOf(prop)
			const tops = [...row.querySelectorAll('.so-tags-item')].map((item) =>
				Math.round(item.getBoundingClientRect().top),
			)

			expect(new Set(tops).size, 'строк в ряду').toBeGreaterThan(1)
			expect(contentEdge(row)).toBeLessThanOrEqual(stageOf(prop).right + 0.5)
		})
	})
})
