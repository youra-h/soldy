/**
 * Цвет иконки — лестница приоритетов, одна на оба пакета и оба способа
 * рисования (`docs/agents/theming.md`, «Пакеты иконок»). От слабого к
 * сильному:
 *
 * 1. цвет, с которым иконка загружена, — тот, что стоит в SVG пакета: у
 *    Material заливка `#1f1f1f`, у Lucide линия цвета текста. Правила темы до
 *    иконки не дошли — она такого цвета;
 * 2. цвет по умолчанию от темы: у oren — цвет текста места, где иконка стоит
 *    (`:where(.so-icon)` в `themes/oren/src/components/icon/_icon.scss`).
 *    Пока цвет текста давала только кнопка, стрелка Select в тёмной схеме едва
 *    виднелась на тёмном поле рядом со светлой кнопкой очистки. Своё
 *    умолчание тема вправе задать любым цветом — он перекрасит иконку любого
 *    пакета;
 * 3. правило темы для места сильнее умолчания: отметка CheckBox — цветом
 *    варианта, и иконка слота с классом Icon тоже.
 *
 * Тема задаёт цвет переменной `--so-icon-color`, а не `fill` и не `stroke`:
 * Material рисует заливкой, Lucide — линией, и тема этого не знает. Мера —
 * то, чем пакет рисует фигуру (`iconPaint`), а цвет текста решает тема, и тест
 * его не знает: мера — `color` самого места. Одиночная иконка — в месте со
 * своим цветом текста, как у полей и панелей темы: системный текст страницы в
 * светлой схеме чёрный, почти как цвет Material, и без своего цвета случай
 * прошёл бы и без правила. Корень `span` — `<span is="so-icon">` Web
 * Components, рисунок внутри: он наследует переменную корня.
 *
 * Пакет на время тестов — тот, что проверяется, после — снова Material, как в
 * общей настройке прогона (`__tests__/setup.ts`). В jsdom каскада нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { defineComponent, h, nextTick } from 'vue'
import { useIcons } from '@soldy-ui/setup'
import * as lucide from '@soldy-ui/icons-lucide'
import * as material from '@soldy-ui/icons-material'
import { Accordion, AccordionItem, CheckBox, Icon, Select, roleIcon } from '@soldy-ui/vue'
import { TIconElement } from '@soldy-ui/webc'

import { iconPaint, pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Обе схемы: чёрная иконка пропадала в тёмной, а правило у них общее. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Пакеты и цвет, с которым загружены их иконки: заливка Material и линия
 * Lucide цвета текста (`currentColor`).
 */
const PACKS = [
	{ name: 'material', pack: material, loaded: '#1f1f1f' },
	{ name: 'lucide', pack: lucide, loaded: 'currentColor' },
]

/** Глифы строятся один раз, как у компонентов. */
const CLOSE = roleIcon('close')
const CHECK = roleIcon('check')

/** Место со своим цветом текста — текстом темы. */
const PLACE = 'color: var(--so-component-text)'

/** Иконки сцены Vue, которым цвет даёт умолчание темы, — по корню иконки. */
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
			// Голый рисунок роли — без класса Icon: правил темы у него нет
			h('div', { class: 'so-test-bare', style: PLACE }, [h(CLOSE)]),
			// Отметка флажка — место со своим цветом иконки: своя отметка — голый
			// рисунок роли, отметка слота — `<Icon>`
			h('div', { style: PLACE }, [
				h(CheckBox, { class: 'so-test-mark', value: true }),
				h(
					CheckBox,
					{ class: 'so-test-slot', value: true },
					{ icon: () => h(Icon, { tag: CHECK }) },
				),
			]),
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

/** Разметка Web Components и свои правила темы — снимаются после каждого теста. */
const staged: Element[] = []

/** `<span is="so-icon">` в месте со своим цветом текста, в схеме темы. */
async function showElement(scheme: (typeof SCHEMES)[number]): Promise<Element> {
	document.documentElement.dataset.soTheme = scheme

	const node = document.createElement('div')

	node.setAttribute('style', PLACE)
	node.innerHTML = '<span is="so-icon" icon="close"></span>'
	document.body.append(node)
	staged.push(node)
	await nextFrame()

	const icon = node.firstElementChild

	if (!(icon instanceof TIconElement)) throw new Error('<span is="so-icon"> нет')

	return icon
}

/** Своё правило темы на время теста — так, как его пишет тема. */
function themeRule(css: string): void {
	const sheet = document.createElement('style')

	sheet.textContent = css
	document.head.append(sheet)
	staged.push(sheet)
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении стиля. */
function at(selector: string): Element {
	const node = document.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node
}

/** Рисунок отметки флажка — `svg` в его коробке. */
const markOf = (checkBox: string) => at(`${checkBox} .so-check-box__container > svg`)

/** Цвет в байтах sRGB: `getComputedStyle` отдаёт его в той записи, в которой он объявлен. */
const bytes = (color: string) => [...pixel([color])]

/** Цвет токена темы, как его разрешает браузер, — пробой в месте. */
function token(name: string): string {
	const probe = document.createElement('span')

	probe.style.color = `var(${name})`
	document.body.append(probe)

	const color = style(probe).color

	probe.remove()

	return color
}

afterEach(() => {
	cleanup()
	staged.splice(0).forEach((node) => node.remove())
})

describe.each(PACKS)('$name', ({ pack, loaded }) => {
	beforeEach(() => {
		useIcons(pack)
	})

	afterEach(() => {
		useIcons(material)
	})

	describe.each(SCHEMES)('%s', (scheme) => {
		it('без правил темы — цвет, с которым иконка загружена', async () => {
			await show(scheme)

			const bare = at('.so-test-bare > svg')
			const expected = loaded === 'currentColor' ? style(bare).color : loaded

			expect(bytes(iconPaint(bare)), `рисунок, текст ${style(bare).color}`).toEqual(
				bytes(expected),
			)
		})

		it.each(Object.entries(ICONS))(
			'умолчание темы: %s — цветом текста',
			async (_, selector) => {
				await show(scheme)

				const icon = at(selector)

				expect(bytes(iconPaint(icon)), `текст ${style(icon).color}`).toEqual(
					bytes(style(icon).color),
				)
			},
		)

		it('умолчание темы: <span is="so-icon"> — рисунок внутри корня цветом текста', async () => {
			const icon = await showElement(scheme)

			expect(bytes(iconPaint(icon))).toEqual(bytes(style(icon).color))
		})

		it('место сильнее умолчания: отметка флажка — цветом места, и отметка слота тоже', async () => {
			await show(scheme)

			const own = iconPaint(markOf('.so-test-mark'))

			expect(bytes(own), 'отметка не цветом текста').not.toEqual(
				bytes(style(markOf('.so-test-mark')).color),
			)
			expect(bytes(iconPaint(markOf('.so-test-slot')))).toEqual(bytes(own))
		})

		it('своё умолчание темы перекрашивает иконку пакета, а место — сильнее его', async () => {
			// Умолчание другой темы — не цвет текста: так видно, что оно доходит и
			// до заливки Material, и до линии Lucide
			themeRule('.so-icon { --so-icon-color: var(--so-accent-500); }')
			await show(scheme)

			const accent = bytes(token('--so-accent-500'))

			expect(bytes(iconPaint(at('.so-test-place > .so-icon')))).toEqual(accent)
			expect(bytes(iconPaint(at(ICONS['стрелка Select'])))).toEqual(accent)
			expect(bytes(iconPaint(markOf('.so-test-slot')))).toEqual(
				bytes(iconPaint(markOf('.so-test-mark'))),
			)
			expect(bytes(iconPaint(markOf('.so-test-slot')))).not.toEqual(accent)
		})
	})
})
