/**
 * Раскладка строки Button в настоящем браузере: слоты у краёв, содержимое
 * области текста — по её выравниванию.
 *
 * Строка — флекс из трёх мест: `leading`, область текста (`.s-button__text`),
 * `trailing`. Область растёт на всё свободное место, поэтому слоты стоят у
 * краёв кнопки, а содержимое выравнивается внутри самой области. Текст двигает
 * `text-align`, иконку — нет: Preflight делает `svg` блочным, и в кнопке шире
 * себя иконка прижималась к началу. Так стоял крестик Popover
 * (`popover.spec.ts`). Строки ListBox, Select и Accordion выравнивают область к
 * началу строки, в RTL это правый край.
 *
 * Проверки сверяют узлы друг с другом, а не с числами темы. В jsdom раскладки
 * нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, type VNodeChild } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import {
	Accordion,
	AccordionItem,
	Button,
	Icon,
	ListBox,
	ListBoxItem,
	Select,
	SelectItem,
	useIcon,
} from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Глиф строится один раз: новый компонент на каждый рендер пересоздавал бы узел. */
const CLOSE = useIcon('close')

const DIRECTIONS = ['ltr', 'rtl'] as const

type TSlots = Partial<Record<'leading' | 'default' | 'trailing', () => VNodeChild>>

/** Иконка с меткой — по метке её и находят. */
const icon = (mark: string) => h(Icon, { tag: CLOSE, class: `s-test-${mark}` })

/**
 * Кнопка заданной ширины. Ширина — инлайном: утилит Tailwind в `dist` темы
 * нет, а по содержимому кнопка сжимается сама, и области текста некуда было бы
 * расти.
 */
const buttonHarness = (props: Record<string, unknown>, slots: TSlots) =>
	defineComponent({
		render() {
			return h('div', { style: 'padding: 16px' }, [
				h(Button, { class: 's-test-button', ...props }, slots),
			])
		},
	})

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и раскладка после плагинов: `TElementPlugin` ждёт кадр. */
const show = async (component: Parameters<typeof render>[0]) => {
	render(component)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): Element => {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

const px = (value: string) => parseFloat(value)

/** Бокс самого текста области — по глифам, а не по узлу: узел растянут на всё место. */
const textBox = (area: Element): DOMRect => {
	const node = [...area.childNodes].find(
		(child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
	)

	if (!node) throw new Error('в области нет текста')

	const range = document.createRange()

	range.selectNodeContents(node)

	return range.getBoundingClientRect()
}

/** Середина бокса по горизонтали и вертикали. */
const middle = (rect: DOMRect) => ({
	x: rect.left + rect.width / 2,
	y: rect.top + rect.height / 2,
})

/** Внутренние края кнопки: рамка и паддинг слоты не занимают. */
const contentEdges = (element: Element) => {
	const style = getComputedStyle(element)
	const rect = box(element)

	return {
		left: rect.left + px(style.borderLeftWidth) + px(style.paddingLeft),
		right: rect.right - px(style.borderRightWidth) - px(style.paddingRight),
		gap: px(style.columnGap),
	}
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
	// Направление ставится корню документа: панель Select телепортирована в
	// `body`, и обёртка с `dir` до неё не достала бы.
	document.documentElement.removeAttribute('dir')
})

describe('кнопка: содержимое области текста — по центру', () => {
	describe.each(COMPONENT_SIZES)('размер %s', (size) => {
		it('иконка в слоте по умолчанию — по центру кнопки шире себя', async () => {
			await show(
				buttonHarness({ size, style: 'width: 96px' }, { default: () => icon('glyph') }),
			)

			const button = box(find('.s-test-button'))
			const glyph = box(find('.s-test-glyph'))

			expect(glyph.width).toBeLessThan(button.width)
			expect(middle(glyph).x).toBeCloseTo(middle(button).x, 0)
			expect(middle(glyph).y).toBeCloseTo(middle(button).y, 0)
		})
	})

	it('в RTL иконка тоже по центру', async () => {
		document.documentElement.dir = 'rtl'

		await show(buttonHarness({ style: 'width: 96px' }, { default: () => icon('glyph') }))

		expect(middle(box(find('.s-test-glyph'))).x).toBeCloseTo(
			middle(box(find('.s-test-button'))).x,
			0,
		)
	})

	it('текст — по центру кнопки', async () => {
		await show(buttonHarness({ text: 'Ок', style: 'width: 160px' }, {}))

		const text = textBox(find('.s-test-button .s-button__text'))

		expect(text.width).toBeLessThan(box(find('.s-test-button')).width)
		expect(middle(text).x).toBeCloseTo(middle(box(find('.s-test-button'))).x, 0)
	})
})

describe('кнопка: слоты у краёв, середина — всё место между ними', () => {
	const slots: TSlots = {
		leading: () => icon('leading'),
		default: () => 'Сохранить',
		trailing: () => icon('trailing'),
	}

	it.each(DIRECTIONS)(
		'%s: leading у начала, trailing у конца, текст — по центру области',
		async (dir) => {
			document.documentElement.dir = dir

			await show(buttonHarness({ style: 'width: 240px' }, slots))

			const edges = contentEdges(find('.s-test-button'))
			const leading = box(find('.s-test-leading'))
			const trailing = box(find('.s-test-trailing'))
			const area = find('.s-test-button .s-button__text')
			const [start, end]: [DOMRect, DOMRect] =
				dir === 'ltr' ? [leading, trailing] : [trailing, leading]

			expect(start.left).toBeCloseTo(edges.left, 1)
			expect(end.right).toBeCloseTo(edges.right, 1)
			expect(box(area).left).toBeCloseTo(start.right + edges.gap, 1)
			expect(box(area).right).toBeCloseTo(end.left - edges.gap, 1)
			expect(middle(textBox(area)).x).toBeCloseTo(middle(box(area)).x, 0)
		},
	)
})

describe('кнопка: длинный текст', () => {
	const LONG = 'Сохранить изменения в настройках профиля и вернуться к списку'

	it('обрезается многоточием, слоты остаются у краёв', async () => {
		await show(
			buttonHarness(
				{ style: 'width: 160px' },
				{
					leading: () => icon('leading'),
					default: () => LONG,
					trailing: () => icon('trailing'),
				},
			),
		)

		const button = find('.s-test-button')
		const area = find('.s-test-button .s-button__text')
		const style = getComputedStyle(area)
		const edges = contentEdges(button)
		const trailing = box(find('.s-test-trailing'))

		// Многоточие рисует только блочный контейнер: у флекс-контейнера текст —
		// анонимный флекс-элемент, и `text-overflow` к нему не относится.
		expect(style.display).toBe('block')
		expect(style.textOverflow).toBe('ellipsis')
		expect(area.scrollWidth).toBeGreaterThan(area.clientWidth)

		expect(box(button).width).toBeCloseTo(160, 1)
		expect(box(find('.s-test-leading')).left).toBeCloseTo(edges.left, 1)
		expect(trailing.right).toBeCloseTo(edges.right, 1)
		expect(box(area).right).toBeLessThanOrEqual(trailing.left)
	})
})

/**
 * Строки списков: в каждом первая строка — текст, вторая — иконка в слоте
 * содержимого строки, третья — длинный текст. Ширину строк тест не задаёт — у
 * панели Select она своя, — и длинная строка оставляет коротким место, внутри
 * которого есть что выравнивать.
 */
const ROWS: Record<string, { list: () => VNodeChild; area: string }> = {
	ListBox: {
		list: () =>
			h(ListBox, null, () => [
				h(ListBoxItem, { key: 'text', value: 'text', text: 'Москва' }),
				h(ListBoxItem, { key: 'icon', value: 'icon' }, { default: () => icon('glyph') }),
				h(ListBoxItem, { key: 'long', value: 'long', text: 'Санкт-Петербург и область' }),
			]),
		area: '.s-list-box-item .s-button__text',
	},
	Select: {
		list: () =>
			h(Select, { open: true }, () => [
				h(SelectItem, { key: 'text', value: 'text', text: 'Москва' }),
				h(SelectItem, { key: 'icon', value: 'icon' }, { default: () => icon('glyph') }),
				h(SelectItem, { key: 'long', value: 'long', text: 'Санкт-Петербург и область' }),
			]),
		area: '.s-select-item .s-button__text',
	},
	Accordion: {
		list: () =>
			h(Accordion, null, () => [
				h(AccordionItem, { key: 'text', value: 'text', text: 'Москва' }),
				h(AccordionItem, { key: 'icon', value: 'icon' }, { header: () => icon('glyph') }),
				h(AccordionItem, { key: 'long', value: 'long', text: 'Санкт-Петербург и область' }),
			]),
		area: '.s-accordion-item__header .s-button__text',
	},
}

describe.each(Object.entries(ROWS))('%s: содержимое строки — у начала', (name, row) => {
	it.each(DIRECTIONS)('%s: текст и иконка — у начала области текста', async (dir) => {
		document.documentElement.dir = dir

		await show(
			defineComponent({
				render: () => h('div', { style: 'width: 320px' }, [row.list()]),
			}),
		)

		const [textArea, iconArea] = [...document.querySelectorAll(row.area)]

		if (!textArea || !iconArea) throw new Error(`${name}: строк нет`)

		const text = textBox(textArea)
		const glyph = box(find('.s-test-glyph'))
		const side = dir === 'ltr' ? 'left' : 'right'

		expect(text.width).toBeLessThan(box(textArea).width)
		expect(glyph.width).toBeLessThan(box(iconArea).width)
		expect(text[side]).toBeCloseTo(box(textArea)[side], 0)
		expect(glyph[side]).toBeCloseTo(box(iconArea)[side], 0)
	})
})
