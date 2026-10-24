/**
 * Прокрутка списка в настоящем браузере — одно правило на ListBox, Select и
 * меню: список докручивает к элементу за значением и за подсветкой, откуда бы
 * они ни пришли (`TListScrollPlugin`).
 *
 * Правило по фактам и источникам проверяют юнит-тесты
 * (`plugins/__tests__/list-scroll.plugin.spec.ts`) на коробках, которые задаёт
 * тест. Здесь то, чего jsdom не считает: настоящая раскладка темы, клик
 * мышью с фокусом строки, панель меню у якоря и прокрутка страницы. Значение
 * двигает только сам список — срезанная строка после клика встаёт целиком у
 * края, а не уезжает в середину, и страница стоит; подсветка — ближайшим
 * краем: меню, открытое стрелкой вверх, показывает последний пункт.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h, ref } from 'vue'
import { Button, ListBox, Menu, Select } from '@soldy-ui/vue'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

const COUNT = 40
const MAX_ROWS = 6

const ITEMS = Array.from({ length: COUNT }, (_, index) => ({
	value: `v${index + 1}`,
	text: `Пункт ${index + 1}`,
}))

/** Несколько кадров: узел корня у плагинов, прокрутка кадром позже, отрисовка. */
async function frames(count = 4): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Окно прокрутки списка — его паддинг-бокс, как его видит пользователь. */
function windowOf(list: HTMLElement): { top: number; bottom: number } {
	const top = list.getBoundingClientRect().top + list.clientTop

	return { top, bottom: top + list.clientHeight }
}

/** Элемент списка по тексту среди узлов `selector`. */
function itemOf(selector: string, text: string): HTMLElement {
	const item = [...document.querySelectorAll<HTMLElement>(selector)].find(
		(node) => node.textContent?.trim() === text,
	)

	if (!item) throw new Error(`${text}: элемента нет`)

	return item
}

/** Элемент виден в окне списка целиком. */
function inView(item: HTMLElement, list: HTMLElement): boolean {
	const box = windowOf(list)
	const rect = item.getBoundingClientRect()

	return rect.top >= box.top - EPSILON && rect.bottom <= box.bottom + EPSILON
}

/** Середина элемента — в середине окна списка. */
function centered(item: HTMLElement, list: HTMLElement): boolean {
	const box = windowOf(list)
	const rect = item.getBoundingClientRect()

	return Math.abs(rect.top + rect.height / 2 - (box.top + box.bottom) / 2) < EPSILON * 2
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
	window.scrollTo(0, 0)
})

describe('значение — двигается только сам список', () => {
	const listBox = () => find('.so-list-box > .so-list-box__list')

	/**
	 * Строку, срезанную нижним краем списка, нажимают мышью за видимую часть —
	 * без прокрутки, которую `userEvent.click` сделал бы до нажатия. Клик —
	 * значение: строка встаёт целиком у нижнего края и остаётся под курсором, а
	 * не уезжает в середину списка.
	 */
	it('ListBox: клик по срезанной строке — она целиком у края, а не в середине', async () => {
		render(
			defineComponent({
				render: () =>
					h(ListBox, {
						items: ITEMS,
						maxRows: MAX_ROWS,
						scrollBehavior: 'instant',
						aria_label: 'Пункты',
					}),
			}),
		)
		await frames()

		const list = listBox()
		const [first, second] = [
			itemOf('.so-list-box-item', 'Пункт 1'),
			itemOf('.so-list-box-item', 'Пункт 2'),
		]
		const step = second.getBoundingClientRect().top - first.getBoundingClientRect().top

		// Список прокручен на три с половиной строки: строка у нижнего края срезана
		list.scrollTop = step * 3.5
		await frames()

		const box = windowOf(list)
		const cut = [...document.querySelectorAll<HTMLElement>('.so-list-box-item')].find(
			(item) => {
				const rect = item.getBoundingClientRect()

				return rect.top < box.bottom - EPSILON && rect.bottom > box.bottom + EPSILON
			},
		)

		if (!cut) throw new Error('срезанной строки у нижнего края нет')

		const text = cut.textContent?.trim() ?? ''
		const visible = cut.getBoundingClientRect()
		const scrollY = window.scrollY

		await userEvent.hover(list, {
			position: {
				x: 20,
				y: (visible.top + box.bottom) / 2 - list.getBoundingClientRect().top,
			},
		})
		await commands.mouseDown()
		await commands.mouseUp()
		await frames()

		const row = itemOf('.so-list-box-item', text)

		expect(row.querySelector('[aria-selected="true"]')).not.toBeNull()
		expect(inView(row, list)).toBe(true)
		expect(Math.abs(row.getBoundingClientRect().bottom - windowOf(list).bottom)).toBeLessThan(
			EPSILON,
		)
		expect(centered(row, list)).toBe(false)
		expect(window.scrollY).toBe(scrollY)
	})

	/**
	 * Список стоит в нижней половине окна браузера, а под ним — длинная
	 * страница: `scrollIntoView` с середины увёл бы страницу к выбранному.
	 * Значение снаружи двигает только список — дальний выбранный в его середине.
	 */
	it('ListBox: значение снаружи — дальний в середину списка, страница стоит', async () => {
		const value = ref('v1')

		render(
			defineComponent({
				render: () =>
					h('div', [
						h('div', { style: `height: ${window.innerHeight - 260}px` }),
						h(ListBox, {
							items: ITEMS,
							maxRows: MAX_ROWS,
							scrollBehavior: 'instant',
							value: value.value,
							aria_label: 'Пункты',
						}),
						h('div', { style: 'height: 3000px' }),
					]),
			}),
		)
		await frames()

		const scrollY = window.scrollY

		value.value = 'v30'
		await frames()

		const list = listBox()
		const row = itemOf('.so-list-box-item', 'Пункт 30')

		expect(inView(row, list)).toBe(true)
		expect(centered(row, list)).toBe(true)
		expect(window.scrollY).toBe(scrollY)
	})

	/**
	 * Панель Select открыта кликом — прокрутки нет: открытие кликом не факт.
	 * Значение снаружи двигает список панели, а страница стоит.
	 */
	it('Select: значение снаружи при открытой панели — список к нему, страница стоит', async () => {
		const value = ref<string | undefined>(undefined)

		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px; width: 320px' }, [
						h(Select, {
							items: ITEMS,
							maxRows: MAX_ROWS,
							scrollBehavior: 'instant',
							value: value.value,
						}),
						h('div', { style: 'height: 3000px' }),
					]),
			}),
		)
		await frames()

		await userEvent.click(find('.so-select__field input'))
		await frames()

		const list = find('.so-select__list')
		const scrollY = window.scrollY

		expect(list.scrollTop).toBe(0)

		value.value = 'v30'
		await frames()

		const option = itemOf('.so-select__list .so-select-item', 'Пункт 30')

		expect(inView(option, list)).toBe(true)
		expect(centered(option, list)).toBe(true)
		expect(window.scrollY).toBe(scrollY)
	})
})

describe('подсветка — ближайшим краем', () => {
	/**
	 * Фокус модель фокуса ставит на последний пункт без прокрутки, и раньше он
	 * оставался за краем длинного меню. Теперь к подсвеченному докручивает
	 * список пунктов — ближайшим краем, у нижнего края.
	 */
	it('меню, открытое ↑, показывает последний пункт', async () => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 40px' }, [
						h(
							Menu,
							{ items: ITEMS },
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
		await frames()

		const scrollY = window.scrollY

		find('.so-test-trigger').focus()
		await userEvent.keyboard('{ArrowUp}')
		await frames(6)

		const list = find('.so-menu__list')
		const last = itemOf('.so-menu__list .so-menu-item', `Пункт ${COUNT}`)

		// Меню длиннее панели: список прокручивается сам
		expect(list.scrollHeight).toBeGreaterThan(list.clientHeight)
		expect(document.activeElement && last.contains(document.activeElement)).toBe(true)

		// Движение разрешено, и к подсветке список едет плавно (`scrollIntoView`
		// со `smooth`). Плавно ли он едет на деле, решает браузер по системе:
		// Chromium на Windows прокручивал мгновенно, на Linux CI — за полсекунды и
		// дольше, и замер через фиксированные кадры застал список на полпути.
		// Ждётся конец пути — пункт у нижнего края окна, а не время
		await expect
			.poll(() => Math.abs(last.getBoundingClientRect().bottom - windowOf(list).bottom), {
				timeout: 3000,
			})
			.toBeLessThan(EPSILON)
		expect(inView(last, list)).toBe(true)
		expect(window.scrollY).toBe(scrollY)
	})
})
