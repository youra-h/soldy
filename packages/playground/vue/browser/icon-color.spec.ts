/**
 * Цвет иконок вне кнопки — в обеих схемах, по вычисленным стилям.
 *
 * Пакет иконок снимает с рисунка свой `fill` и оставляет цвет теме
 * (`icons/material/scripts/generate.mjs`), а рисунок без `fill` берёт
 * умолчание SVG — чёрный. Цвет текста иконкам давала только кнопка
 * (`.so-button svg` в `themes/oren/src/components/button/_button.scss`), и
 * иконка вне кнопки оставалась чёрной в обеих схемах: стрелка Select в тёмной
 * едва виднелась на тёмном поле рядом со светлой кнопкой очистки, одиночная
 * иконка потребителя — так же. Теперь цвет текста места иконке даёт её база
 * (`:where(.so-icon)` в `icon/_icon.scss`).
 *
 * Цвет текста решает тема, и тест его не знает: мера — `color` самого
 * рисунка, который он наследует от места. Из иконок, которые рисует разметка
 * библиотеки, вне кнопки стоит только стрелка Select. Стрелка Accordion — в
 * кнопке заголовка, цвет текста брала и раньше, и сверяется как вторая
 * стрелка: обе обязаны идти за текстом, где бы ни стояли. Одиночная иконка — в
 * месте со своим цветом текста, как у полей и панелей темы: системный текст
 * страницы в светлой схеме чёрный, как умолчание SVG, и без своего цвета
 * случай прошёл бы и без правила. Корень `span` — `<span is="so-icon">` Web
 * Components, рисунок внутри: он наследует `fill` корня.
 *
 * В jsdom каскада нет.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import { Accordion, AccordionItem, Icon, Select, roleIcon } from '@soldy-ui/vue'
import { TIconElement } from '@soldy-ui/webc'

import { pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Обе схемы: чёрная иконка пропадала в тёмной, а правило у них общее. */
const SCHEMES = ['oren', 'oren-dark'] as const

/** Глиф строится один раз, как у компонентов. */
const CLOSE = roleIcon('close')

/** Место со своим цветом текста — текстом темы. */
const PLACE = 'color: var(--so-component-text)'

/** Иконки сцены Vue — по корню иконки. */
const ICONS = {
	'стрелка Select': '.so-select__arrow > .so-icon',
	'стрелка Accordion': '.so-accordion-item__arrow > .so-icon',
	'<Icon> вне кнопки': '.so-test-place > .so-icon',
}

const scene = defineComponent({
	render: () =>
		h('div', { style: 'padding: 40px; width: 320px; display: grid; gap: 16px' }, [
			h(Select),
			h(Accordion, null, () => [
				h(AccordionItem, { value: 'a', text: 'Секция' }, { default: () => 'Содержимое' }),
			]),
			h('div', { class: 'so-test-place', style: PLACE }, [h(Icon, { tag: CLOSE })]),
		]),
})

/** Сцена в схеме темы, корни объявлены плагинам: `TElementPlugin` ждёт кадр. */
async function show(scheme: (typeof SCHEMES)[number]): Promise<void> {
	document.documentElement.dataset.soTheme = scheme
	render(scene)

	await nextTick()
	await nextFrame()
	await settled(document.body)
}

/** Разметка Web Components — снимается после каждого теста. */
let stage: HTMLElement | null = null

/** `<span is="so-icon">` в месте со своим цветом текста, в схеме темы. */
function showElement(scheme: (typeof SCHEMES)[number]): Element {
	document.documentElement.dataset.soTheme = scheme

	const node = document.createElement('div')

	node.setAttribute('style', PLACE)
	node.innerHTML = '<span is="so-icon" icon="close"></span>'
	document.body.append(node)
	stage = node

	const icon = node.firstElementChild

	if (!(icon instanceof TIconElement)) throw new Error('<span is="so-icon"> нет')

	return icon
}

/** Корень иконки по селектору; нет его — тест падает здесь, а не на чтении стиля. */
function iconAt(selector: string): Element {
	const icon = document.querySelector(selector)

	if (!icon) throw new Error(`${selector}: иконки нет`)

	return icon
}

/**
 * Рисунок иконки — то, что видит глаз: первый узел её `<svg>`. У корня `svg`
 * это его ребёнок, у корня `span` — ребёнок `<svg>` внутри.
 */
function drawing(icon: Element): Element {
	const svg = icon instanceof SVGSVGElement ? icon : icon.querySelector(':scope > svg')
	const shape = svg?.firstElementChild

	if (!shape) throw new Error('рисунка в иконке нет')

	return shape
}

/**
 * Рисунок — цветом своего текста. Цвета сверяются байтами sRGB (`pixel`):
 * `getComputedStyle` отдаёт цвет в той записи, в которой он объявлен.
 */
function expectTextColored(icon: Element): void {
	const { fill, color } = style(drawing(icon))

	expect([...pixel([fill])], `рисунок ${fill}, текст ${color}`).toEqual([...pixel([color])])
}

afterEach(() => {
	cleanup()
	stage?.remove()
	stage = null
})

describe.each(SCHEMES)('%s', (scheme) => {
	it.each(Object.entries(ICONS))('%s: рисунок — цветом текста', async (_, selector) => {
		await show(scheme)

		expectTextColored(iconAt(selector))
	})

	it('<span is="so-icon"> вне кнопки: рисунок внутри корня — цветом текста', () => {
		expectTextColored(showElement(scheme))
	})
})
