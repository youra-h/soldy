/**
 * Стенд в узком окне не прокручивается вбок.
 *
 * Основная область стенда (`.pg__main`) прокручивается сама, и всё, что шире
 * неё, уводит её вбок. В окне телефона (375 px) так было в двух местах.
 * Строка свойства держала имя и контрол рядом, двумя колонками фиксированной
 * ширины, и вместе с зазором они не помещались. Широкая ячейка витрины
 * (`span 2`) в сетке из одной дорожки достраивала вторую, неявную, и
 * растягивала сетку почти вдвое шире окна. Одна дорожка у витрины бывает и в
 * окне шире узкого: меню стоит колонкой и забирает место у сетки, — поэтому
 * случай с меню идёт отдельным окном, а широкое окно сверяет, что там
 * широкая ячейка по-прежнему занимает две дорожки.
 *
 * Ширину задаёт окно (`page.viewport`), а не `body`: раскладку стенда считают
 * от окна правило `@media` в `src/styles.css` и `useSidebar`
 * (см. `tags-preview.spec.ts`). Каждый случай сверяет и саму раскладку, ради
 * которой взято окно, — иначе тест мерил бы другую.
 */

import { describe, it, expect } from 'vitest'
import { render } from 'vitest-browser-vue'
import { page } from 'vitest/browser'
import { setIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import App from '../src/App.vue'
import { router } from '../src/router'

import '@soldy-ui/theme-oren'
import oren from '@soldy-ui/theme-oren/setup'
import '../src/styles.css'

setIcons(material)
useTheme(oren)

const HEIGHT = 800

/** Ширина сетки витрины, с которой в неё помещаются две дорожки: 2 × 280 + 16. */
const TWO_TRACKS = 576

const settle = () => new Promise((resolve) => setTimeout(resolve, 300))

/** Открыть страницу стенда в окне заданной ширины. */
const open = async (width: number, path: string) => {
	document.documentElement.dataset.soTheme = 'oren'

	await page.viewport(width, HEIGHT)
	await router.push(path)

	render(App, { global: { plugins: [router] } })

	await settle()
}

/** Узел по селектору — или ошибка с его именем. */
const find = (selector: string): HTMLElement => {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`узла ${selector} нет`)

	return node
}

/** Меню ушло в выезжающую панель — раскладка узкого окна. */
const narrowLayout = () => document.querySelector('.pg--narrow') !== null

/** Имя узла для сообщения: тег и классы. */
const label = (node: Element) => [node.tagName.toLowerCase(), ...node.classList].join('.')

/**
 * Что вылезает за край содержимого области — только для сообщения упавшей
 * проверки: самые внешние такие узлы, которых ничто внутри области не
 * обрезает.
 */
const overflowing = (main: HTMLElement): string => {
	const edge =
		main.getBoundingClientRect().left +
		main.clientWidth -
		parseFloat(getComputedStyle(main).paddingRight) +
		0.5
	const beyond = (node: Element | null) =>
		node instanceof HTMLElement && node.getBoundingClientRect().right > edge
	const clipped = (node: Element) => {
		for (let up = node.parentElement; up && up !== main; up = up.parentElement) {
			if (getComputedStyle(up).overflowX !== 'visible') return true
		}

		return false
	}

	return [...main.querySelectorAll('*')]
		.filter((node) => beyond(node) && !beyond(node.parentElement) && !clipped(node))
		.slice(0, 5)
		.map(label)
		.join(', ')
}

/** Область не прокручивается вбок: содержимое не шире её видимой части. */
const expectNoSideScroll = () => {
	const main = find('.pg__main')

	expect(main.scrollWidth, `вылезает: ${overflowing(main)}`).toBeLessThanOrEqual(main.clientWidth)
}

/** Ширины широкой и обычной ячеек витрины и зазор между дорожками. */
const cells = () => {
	const gap = parseFloat(getComputedStyle(find('.pg-grid')).columnGap)
	const wide = find('.pg-cell--wide').getBoundingClientRect().width
	const regular = find('.pg-cell:not(.pg-cell--wide)').getBoundingClientRect().width

	return { gap, wide, regular }
}

describe('стенд в узком окне не прокручивается вбок', () => {
	it('375 px, страница свойств: имя свойства — над контролом, строка в ширину окна', async () => {
		await open(375, '/vue/field')

		expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

		expectNoSideScroll()

		const name = find('.pg-prop__head .pg-prop__name').getBoundingClientRect()
		const control = find('.pg-prop__head .pg-prop__control').getBoundingClientRect()

		expect(name.bottom, 'имя над контролом').toBeLessThanOrEqual(control.top + 0.5)
	})

	it('375 px, витрина: широкая ячейка — в одну дорожку, превью не шире ячейки', async () => {
		await open(375, '/vue')

		expect(narrowLayout(), 'меню в выезжающей панели').toBe(true)

		expectNoSideScroll()

		const { wide, regular } = cells()

		expect(wide, 'широкая ячейка — как обычная').toBeCloseTo(regular, 0)
	})

	it('800 px, витрина: при меню колонкой дорожка одна, и широкая ячейка — в ней', async () => {
		await open(800, '/vue')

		expect(narrowLayout(), 'меню колонкой').toBe(false)
		expect(find('.pg-grid').clientWidth, 'сетка уже двух дорожек').toBeLessThan(TWO_TRACKS)

		expectNoSideScroll()

		const { wide, regular } = cells()

		expect(wide, 'широкая ячейка — как обычная').toBeCloseTo(regular, 0)
	})

	it('1280 px, витрина: широкая ячейка по-прежнему на две дорожки', async () => {
		await open(1280, '/vue')

		expect(
			find('.pg-grid').clientWidth,
			'сетка на две дорожки и больше',
		).toBeGreaterThanOrEqual(TWO_TRACKS)

		const { gap, wide, regular } = cells()

		expect(wide, 'две дорожки и зазор между ними').toBeCloseTo(regular * 2 + gap, 0)
	})
})
