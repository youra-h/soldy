/**
 * Группы ListBox и Select в настоящем браузере: раскладка подписи и
 * разделителя, порядок стрелок на экране и предел строк вместе с группами.
 * Подпись группы у них и у Menu одна (`mixins/_group.scss` темы), и её вид —
 * кегль, начертание, цвет и поля — сверяется у всех троих.
 *
 * Модель — `core/__tests__/list-groups.spec.ts`, разметка секций и ARIA —
 * `ui/vue/__tests__/list-groups.spec.ts`. Здесь — то, чего jsdom не видит:
 * где подпись стоит относительно строк, какого она кегля, что разделитель —
 * видимая линия во всю ширину списка, что стрелки идут сверху вниз по экрану и
 * что предел строк (`maxRows`) режет список по низу последней из первых
 * строк, с подписями и разделителями между ними.
 *
 * Подпись — справка над строками, а не акцент, и устроена как справка у поля:
 * кегль, интерлиньяж и начертание — подсказки Field того же размера, цвет —
 * тише неё, но заметнее линии разделителя. Цвета тест не знает: меряет
 * контраст с подложкой подписи по WCAG (`contrast` в `./colors`).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import type { TComponentSize } from '@soldy-ui/core'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Button, Field, Input, ListBox, Menu, Select } from '@soldy-ui/vue'

import { contrast, opacity } from './colors'
import { settled } from './transitions'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

/** Обе схемы: подложка подписи и её цвет у каждой свои. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * В данных овощи стоят между фруктами, у «Воды» группы нет. На экране —
 * «Фрукты»: Яблоко, Груша, разделитель, «Овощи»: Морковь, Свёкла,
 * разделитель, Вода.
 */
const ITEMS = [
	{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
	{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
	{ value: 'water', text: 'Вода' },
	{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	{ value: 'beet', text: 'Свёкла', _: { group: 'veg' } },
]

const GROUPS = [
	{ key: 'fruit', label: 'Фрукты' },
	{ key: 'veg', label: 'Овощи' },
]

/** Тексты строк в порядке экрана. */
const SCREEN_ORDER = ['Яблоко', 'Груша', 'Морковь', 'Свёкла', 'Вода']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Несколько кадров: корень плагинам, предел строк и раскладка после него. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Все узлы по селектору — HTML-узлы. */
const findAll = (selector: string, root: ParentNode = document): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter((node) => node instanceof HTMLElement)

/** Элемент списка по тексту строки. */
const itemOf = (block: string, text: string, root: ParentNode = document): HTMLElement => {
	const found = findAll(`.${block}-item`, root).find((item) => item.textContent?.trim() === text)

	if (!found) throw new Error(`${text}: элемента нет`)

	return found
}

/**
 * Левый край текста внутри узла — по первому непустому текстовому узлу:
 * поле узла и отступы его детей в него уже вошли.
 */
function textLeft(element: Element): number {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) =>
			node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
	})
	const text = walker.nextNode()

	if (!text) throw new Error('текста в узле нет')

	const range = document.createRange()

	range.selectNodeContents(text)

	return range.getBoundingClientRect().left
}

/**
 * Строка текста подписи — её коробка без полей. Подпись в одну строку
 * (`truncate`), и это строка целиком, с интерлиньяжем: коробку самих глифов
 * браузер ставит в строку с округлением до пикселя, и половины интерлиньяжа
 * над глифами и под ними расходятся на пиксель.
 */
function lineOf(label: HTMLElement): { top: number; bottom: number } {
	const box = label.getBoundingClientRect()
	const { paddingTop, paddingBottom } = getComputedStyle(label)

	return {
		top: box.top + parseFloat(paddingTop),
		bottom: box.bottom - parseFloat(paddingBottom),
	}
}

const fontSize = (element: Element): number => parseFloat(getComputedStyle(element).fontSize)

/** Строка элемента — кнопка внутри него: кегль строки — её. */
const rowOf = (item: HTMLElement): HTMLElement => find(':scope > .so-button', item)

/**
 * Подпись каждой группы: над первой строкой группы, текст — по началу текста
 * строк, кегль — мельче строки.
 */
function expectLabels(list: HTMLElement, block: string): void {
	const groups = findAll(`.${block}-group`, list)

	expect(groups).toHaveLength(GROUPS.length)

	for (const group of groups) {
		const label = find(`.${block}-group__label`, group)
		const [first] = findAll(`.${block}-item`, group)
		const row = rowOf(first)

		expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			first.getBoundingClientRect().top + EPSILON,
		)
		expect(Math.abs(textLeft(label) - textLeft(row))).toBeLessThan(EPSILON)
		expect(fontSize(label)).toBeLessThan(fontSize(row))
	}
}

/**
 * Разделители — между секциями: видимая линия в один пиксель во всю ширину
 * содержимого списка, ниже предыдущей секции и выше следующей.
 */
function expectSeparators(list: HTMLElement, block: string): void {
	const separators = findAll(`.${block}__separator`, list)
	const style = getComputedStyle(list)
	const width = list.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)

	expect(separators).toHaveLength(2)

	for (const separator of separators) {
		const box = separator.getBoundingClientRect()
		const line = getComputedStyle(separator)
		const before = separator.previousElementSibling
		const after = separator.nextElementSibling

		expect(line.borderTopStyle).toBe('solid')
		expect(Math.abs(box.height - 1)).toBeLessThan(EPSILON)
		expect(Math.abs(box.width - width)).toBeLessThan(EPSILON)

		if (!before || !after) throw new Error('у разделителя нет соседей')

		expect(before.getBoundingClientRect().bottom).toBeLessThanOrEqual(box.top + EPSILON)
		expect(after.getBoundingClientRect().top).toBeGreaterThanOrEqual(box.bottom - EPSILON)
	}
}

/**
 * Низ содержимого прокручиваемого списка — по его видимой части: верх, рамка,
 * паддинг-бокс без нижнего поля.
 */
function contentBottom(list: HTMLElement): number {
	const style = getComputedStyle(list)

	return (
		list.getBoundingClientRect().top +
		parseFloat(style.borderTopWidth) +
		list.clientHeight -
		parseFloat(style.paddingBottom)
	)
}

/** Подсказка Field размера `size` — своей сценой на той же странице. */
async function fieldHelper(size: TComponentSize = 'normal'): Promise<HTMLElement> {
	const { container } = await render(
		defineComponent({
			render: () => h(Field, { size, helper: 'Не покажем никому' }, () => h(Input)),
		}),
	)

	return find('.so-field__helper', container)
}

/**
 * Подпись группы — как подсказка Field того же размера: кегль, интерлиньяж и
 * начертание те же.
 */
function expectLikeHelper(label: HTMLElement, helper: HTMLElement): void {
	const own = getComputedStyle(label)
	const field = getComputedStyle(helper)

	expect(own.fontSize).toBe(field.fontSize)
	expect(own.lineHeight).toBe(field.lineHeight)
	expect(own.fontWeight).toBe(field.fontWeight)
}

/**
 * Подложка узла — фон ближайшего предка, который его рисует: у Select и Menu
 * это панель, а ListBox прозрачен и стоит на фоне сцены — поверхности места.
 */
function backdropOf(element: Element): string {
	for (let node: Element | null = element; node; node = node.parentElement) {
		const color = getComputedStyle(node).backgroundColor

		if (opacity(color) === 1) return color
	}

	throw new Error('под узлом нет фона')
}

/**
 * Цвет подписи — тише подсказки Field, но заметнее разделителя: подпись не
 * акцент, а только называет группу, и всё же она текст, а не линия слабой
 * границы. Мера — контраст с подложкой подписи.
 */
function expectQuiet(label: HTMLElement, helper: HTMLElement, separator: HTMLElement): void {
	const backdrop = [backdropOf(label)]
	const own = contrast(getComputedStyle(label).color, backdrop)

	expect(own).toBeLessThan(contrast(getComputedStyle(helper).color, backdrop))
	expect(own).toBeGreaterThan(contrast(getComputedStyle(separator).borderTopColor, backdrop))
}

/**
 * Над текстом подписи и под ним свободно одинаково: от разделителя до строки
 * подписи следующей группы — столько же, сколько от неё до первой строки
 * группы. Сверху — зазор списка и поле подписи, снизу — её поле и зазор
 * группы.
 */
function expectLabelSpace(list: HTMLElement, block: string): void {
	const separator = find(`.${block}__separator`, list)
	const group = separator.nextElementSibling

	if (!(group instanceof HTMLElement)) throw new Error('за разделителем нет группы')

	const line = lineOf(find(`.${block}-group__label`, group))
	const [first] = findAll(`.${block}-item`, group)
	const above = line.top - separator.getBoundingClientRect().bottom
	const below = first.getBoundingClientRect().top - line.bottom

	expect(above).toBeGreaterThan(0)
	expect(Math.abs(above - below)).toBeLessThan(EPSILON)
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('ListBox', () => {
	const list = () => find('.so-list-box > .so-list-box__list')

	/** Фон сцены — поверхность места: ListBox прозрачен, и подпись стоит на ней. */
	async function show(props: Record<string, unknown> = {}): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h(
						'div',
						{
							style: 'padding: 40px; width: 320px; background: var(--so-place-surface)',
						},
						[h(ListBox, { items: ITEMS, groups: GROUPS, ...props })],
					),
			}),
		)

		await nextTick()
		await frames()
	}

	it.each(COMPONENT_SIZES)(
		'%s: подпись — над строками группы, текст по началу их текста, кегль мельче',
		async (size) => {
			await show({ size })

			expectLabels(list(), 'so-list-box')
		},
	)

	it.each(COMPONENT_SIZES)(
		'%s: подпись — кегль, интерлиньяж и начертание подсказки Field того же размера',
		async (size) => {
			const helper = await fieldHelper(size)

			await show({ size })

			expectLikeHelper(find('.so-list-box-group__label', list()), helper)
		},
	)

	it.each(SCHEMES)(
		'%s: подпись тише подсказки Field, но заметнее разделителя',
		async (scheme) => {
			document.documentElement.dataset.soTheme = scheme

			const helper = await fieldHelper()

			await show()

			expectQuiet(
				find('.so-list-box-group__label', list()),
				helper,
				find('.so-list-box__separator', list()),
			)
		},
	)

	it('над текстом подписи и под ним свободно одинаково', async () => {
		await show()

		expectLabelSpace(list(), 'so-list-box')
	})

	it('разделитель — линия во всю ширину списка между секциями', async () => {
		await show()

		expectSeparators(list(), 'so-list-box')
	})

	/**
	 * Порядок стрелок — показанное, а строки стоят флексом по месту в составе:
	 * без секций в разметке подсветка прыгала бы по экрану в порядке данных.
	 */
	it('↓ ведёт подсветку сверху вниз по экрану: группа за группой, без группы — последней', async () => {
		await show()

		const highlighted = () =>
			document.querySelector<HTMLElement>('.so-list-box-item[data-highlighted="true"]')
		const texts: string[] = []
		let top = -Infinity

		list().focus()

		for (let step = 0; step < SCREEN_ORDER.length; step++) {
			const previous = highlighted()

			await userEvent.keyboard('{ArrowDown}')
			await expect.poll(highlighted).not.toBe(previous)

			const item = highlighted()

			if (!item) throw new Error('подсветки нет')

			const { top: next } = item.getBoundingClientRect()

			expect(next).toBeGreaterThan(top)

			top = next
			texts.push(item.textContent?.trim() ?? '')
		}

		expect(texts).toEqual(SCREEN_ORDER)
	})

	/**
	 * Строки в группах — не дети узла списка, и между ними стоят подпись и
	 * разделитель: предел считается по месту последней из первых строк.
	 */
	it('maxRows: в пределе — ровно первые строки вместе с подписями и разделителем', async () => {
		await show({ maxRows: 3 })

		await expect.poll(() => list().style.overflowY).toBe('auto')
		await frames()

		expect(
			Math.abs(
				contentBottom(list()) -
					itemOf('so-list-box', 'Морковь').getBoundingClientRect().bottom,
			),
		).toBeLessThan(EPSILON)
	})

	it('выбранный в группе за пределом — прокручен узел списка, а не группа', async () => {
		await show({ maxRows: 2, value: 'beet' })

		await expect.poll(() => list().scrollTop).toBeGreaterThan(0)

		const view = list().getBoundingClientRect()
		const selected = itemOf('so-list-box', 'Свёкла').getBoundingClientRect()

		expect(findAll('.so-list-box-group', list()).map((group) => group.scrollTop)).toEqual([
			0, 0,
		])
		expect(selected.top).toBeGreaterThanOrEqual(view.top - EPSILON)
		expect(selected.bottom).toBeLessThanOrEqual(view.bottom + EPSILON)
	})
})

/**
 * Список Select — в телепортированной панели, и модификатора размера Select
 * на ней нет: размер подписи тема берёт у строк её группы.
 */
describe('Select', () => {
	const panel = () => find('.so-select__panel')
	const list = () => find('.so-select__list', panel())

	async function open(props: Record<string, unknown> = {}): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px; width: 320px' }, [
						h(Select, { items: ITEMS, groups: GROUPS, ...props }),
					]),
			}),
		)

		await nextTick()
		await frames()

		await userEvent.click(find('.so-select__field input'))
		await expect.poll(() => panel().dataset.open).toBe('true')
		await settled(panel())
		await frames()
	}

	it.each(COMPONENT_SIZES)(
		'%s: подпись — над опциями группы, текст по началу их текста, кегль мельче',
		async (size) => {
			await open({ size })

			expectLabels(list(), 'so-select')
		},
	)

	it('подпись растёт с размером Select', async () => {
		const sizes: number[] = []

		for (const size of COMPONENT_SIZES) {
			await open({ size })

			sizes.push(fontSize(find('.so-select-group__label', list())))
			cleanup()
		}

		expect(sizes).toEqual([...sizes].sort((a, b) => a - b))
		expect(new Set(sizes).size).toBe(COMPONENT_SIZES.length)
	})

	it.each(COMPONENT_SIZES)(
		'%s: подпись — кегль, интерлиньяж и начертание подсказки Field того же размера',
		async (size) => {
			const helper = await fieldHelper(size)

			await open({ size })

			expectLikeHelper(find('.so-select-group__label', list()), helper)
		},
	)

	it.each(SCHEMES)(
		'%s: подпись тише подсказки Field, но заметнее разделителя',
		async (scheme) => {
			document.documentElement.dataset.soTheme = scheme

			const helper = await fieldHelper()

			await open()

			expectQuiet(
				find('.so-select-group__label', list()),
				helper,
				find('.so-select__separator', list()),
			)
		},
	)

	it('над текстом подписи и под ним свободно одинаково', async () => {
		await open()

		expectLabelSpace(list(), 'so-select')
	})

	it('разделитель — линия во всю ширину списка между секциями', async () => {
		await open()

		expectSeparators(list(), 'so-select')
	})

	it('maxRows: в пределе — ровно первые опции вместе с подписями и разделителем', async () => {
		await open({ maxRows: 3 })

		await expect.poll(() => list().style.overflowY).toBe('auto')
		await frames()

		expect(
			Math.abs(
				contentBottom(list()) -
					itemOf('so-select', 'Морковь', panel()).getBoundingClientRect().bottom,
			),
		).toBeLessThan(EPSILON)
	})
})

/**
 * Подпись группы меню — та же, что у ListBox и Select (`group.label`), а
 * размер её тема берёт с модификатора панели: панель телепортирована. Зазоров
 * у списка меню нет, и место над текстом подписи и под ним дают её поля.
 */
describe('Menu', () => {
	const panel = () => find('.so-menu__panel')

	async function open(props: Record<string, unknown> = {}): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px' }, [
						h(
							Menu,
							{ items: ITEMS, groups: GROUPS, ...props },
							{
								trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
									h(Button, {
										text: 'Действия',
										class: 'so-test-trigger',
										...triggerAria,
										...triggerDataset,
									}),
							},
						),
					]),
			}),
		)

		await nextTick()
		await frames()

		await userEvent.click(find('.so-test-trigger'))
		await expect.poll(() => getComputedStyle(panel()).display).not.toBe('none')
		await settled(panel())
		await frames()
	}

	it.each(COMPONENT_SIZES)(
		'%s: подпись — кегль, интерлиньяж и начертание подсказки Field того же размера',
		async (size) => {
			const helper = await fieldHelper(size)

			await open({ size })

			expectLikeHelper(find('.so-menu-group__label', panel()), helper)
		},
	)

	it.each(SCHEMES)(
		'%s: подпись тише подсказки Field, но заметнее разделителя',
		async (scheme) => {
			document.documentElement.dataset.soTheme = scheme

			const helper = await fieldHelper()

			await open()

			expectQuiet(
				find('.so-menu-group__label', panel()),
				helper,
				find('.so-menu-separator', panel()),
			)
		},
	)

	it('поля подписи над текстом и под ним — поровну', async () => {
		await open()

		const { paddingTop, paddingBottom } = getComputedStyle(
			find('.so-menu-group__label', panel()),
		)

		expect(parseFloat(paddingTop)).toBeGreaterThan(0)
		expect(paddingBottom).toBe(paddingTop)
	})
})
