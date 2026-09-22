/**
 * Превью Tags на самой странице стенда, а не на самодельном стенде.
 *
 * Здесь сторожится то, чего не видит ни один тест компонента: превью живёт в
 * ячейке страницы, ячейка — флексбокс, и у флекс-элемента автоминимум равен
 * его содержимому. Ряд тегов из-за этого держал свою ширину в узкой колонке:
 * теги уходили за край, замер мерил не ту ширину, и `overflow` не срабатывал
 * вовсе — ни кнопки «…» в `popover`, ни прокрутки в `scroll`. Проверить это
 * можно только на настоящей странице: в самодельном контейнере такой ячейки
 * нет.
 *
 * Ширину задаёт `body`, а не окно: размер окна прогона — не то, что открыто у
 * человека, а колонки страницы считаются от ширины страницы.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

setIcons(material)
useTheme(oren)

/** Ширины страницы: на первой теги помещаются, на остальных — нет. */
const WIDE = 1440
const NARROW = [1100, 900, 760]

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
	const trigger = row.querySelector('.pg-prop__control .s-select')

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

/** Ряд тегов первой колонки строки — той, что правится пропами. */
const rowOf = (prop: HTMLElement): HTMLElement => {
	const element = prop.querySelector('.pg-col .s-tags:not(.s-tags__panel)')

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

const page = async (width: number) => {
	document.body.style.width = `${width}px`

	await settle()
}

let prop: HTMLElement

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'

	await router.push('/component/tags')

	render(App, { global: { plugins: [router] } })

	await settle()

	prop = propRow('overflow')

	prop.scrollIntoView()
})

afterEach(() => {
	document.body.style.width = ''
})

describe('строка overflow на странице компонента', () => {
	it('popover: ряд не вылезает из ячейки, а хвост уходит под кнопку «…»', async () => {
		await pick(prop, 'popover')

		for (const width of NARROW) {
			await page(width)

			const row = rowOf(prop)
			const stage = stageOf(prop)

			// Ряд в ячейке: шире — значит, замер считает по чужой ширине
			expect(
				row.getBoundingClientRect().right,
				`ширина ${width}: ряд за краем ячейки`,
			).toBeLessThanOrEqual(stage.right + 0.5)

			expect(contentEdge(row), `ширина ${width}: теги за краем ячейки`).toBeLessThanOrEqual(
				stage.right + 0.5,
			)

			expect(
				prop.querySelector('.s-tags__more'),
				`ширина ${width}: кнопки «…» нет`,
			).not.toBeNull()
		}
	})

	/**
	 * Помещаются ли на широкой странице все пять тегов, зависит от ширины
	 * колонки, а она — от окна прогона; поэтому здесь сторожится не отсутствие
	 * кнопки, а то, что ряд и на просторе остаётся в своих границах.
	 */
	it('popover: на широкой странице ряд тоже в границах ячейки', async () => {
		await pick(prop, 'popover')
		await page(WIDE)

		expect(contentEdge(rowOf(prop))).toBeLessThanOrEqual(stageOf(prop).right + 0.5)
	})

	it('scroll: ряд прокручивается внутри ячейки, а не выходит за неё', async () => {
		await pick(prop, 'scroll')
		await page(NARROW[1])

		const row = rowOf(prop)

		// Прокручивать есть что, и прокрутка — у самого ряда
		expect(row.scrollWidth).toBeGreaterThan(row.clientWidth)
		expect(row.getBoundingClientRect().right).toBeLessThanOrEqual(stageOf(prop).right + 0.5)
	})

	it('wrap: ряд переносится строками и тоже остаётся в ячейке', async () => {
		await pick(prop, 'wrap')
		await page(NARROW[2])

		const row = rowOf(prop)
		const tops = [...row.querySelectorAll('.s-tags-item')].map((item) =>
			Math.round(item.getBoundingClientRect().top),
		)

		expect(new Set(tops).size, 'строк в ряду').toBeGreaterThan(1)
		expect(contentEdge(row)).toBeLessThanOrEqual(stageOf(prop).right + 0.5)
	})
})
