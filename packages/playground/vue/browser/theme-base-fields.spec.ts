/**
 * Общий слой тем без темы — поля семьи Input, Tabs, Tags и Accordion: страница
 * только с CSS базы (`@soldy-ui/theme-base`), без `@soldy-ui/theme-oren`.
 *
 * Структура этих частей — раскладка и механика — лежит в базе, а облик в теме
 * (`packages/themes/base/AGENTS.md`, «Перенос структуры»). Без темы части
 * голые — без рамок, цвета и видов, — но рабочие, и здесь это проверяется тем,
 * что видит пользователь, а не числами базы: список табов стоит с заданной
 * стороны от панели, а табы в нём — по оси ориентации, слоты списка — у начала
 * и у конца его строки в обоих направлениях; ряд тегов `scroll` —
 * одной строкой и прокручивается вбок, а тег под фокусом с клавиатуры встаёт
 * в окно ряда; слоты Input и NumberInput — у краёв, ввод — между ними, кнопки
 * шага — у конца поля; Textarea растёт по строкам до `maxRows` и в одну строку
 * — высоты Input; свёрнутая секция Accordion места не занимает, раскрытая
 * встаёт под заголовком. Спеки с темой держат базу под темой, и потерянное ею
 * правило тема могла бы закрыть своим, а сторожа CSS (`themes/base/__tests__/`)
 * раскладки не считают.
 *
 * Страница у файла спека своя (`isolate` прогона), и листа темы на ней нет —
 * это проверяет первый тест. Проверен поломкой: без направления списка
 * вертикальных Tabs в базе (`flex-direction` у `.so-tabs--vertical >
 * .so-tabs__list`) табы встают в строку, и падают все случаи вертикальных, а
 * с физическим полем слота `trailing` (`margin-left` вместо
 * `margin-inline-start`) в RTL он встаёт вплотную к табам, и падает RTL слотов
 * списка.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import type { TComponentSize, TTabsOrientation, TTabsPosition } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import {
	Accordion,
	AccordionItem,
	Input,
	NumberInput,
	Tabs,
	TabsContent,
	TabsItem,
	Tags,
	Textarea,
} from '@soldy-ui/vue'

import '@soldy-ui/theme-base'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 0.5

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и кадры: узлы плагины получают по `ready`, кадром. */
async function show(content: () => VNode | VNode[], dir?: 'ltr' | 'rtl'): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 16px; width: 480px' }, content()),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

/** Метка в слоте: блок своего размера, по ней видно, где стоит слот. */
const mark = (name: string) =>
	h('span', { class: `so-test-${name}`, style: 'display: block; width: 16px; height: 16px' })

/** Начало и конец строки на экране: в RTL начало — справа. */
const edges = (dir: 'ltr' | 'rtl', outer: DOMRect, inner: DOMRect) =>
	dir === 'ltr'
		? { start: inner.left - outer.left, end: outer.right - inner.right }
		: { start: outer.right - inner.right, end: inner.left - outer.left }

/** `b` стоит после `a` по направлению строки. */
const after = (dir: 'ltr' | 'rtl', a: DOMRect, b: DOMRect) =>
	dir === 'ltr' ? b.left >= a.right - EPSILON : b.right <= a.left + EPSILON

afterEach(() => {
	cleanup()
})

describe('страница — только общий слой тем', () => {
	it('переменные базы на месте, токенов темы нет', () => {
		const root = getComputedStyle(document.documentElement)

		expect(root.getPropertyValue('--so-input-height-normal')).not.toBe('')
		expect(root.getPropertyValue('--so-tabs-gap')).not.toBe('')
		expect(root.getPropertyValue('--so-component-text')).toBe('')
		expect(root.getPropertyValue('--so-neutral-500')).toBe('')
	})
})

const TABS = ['Настройки', 'Почта', 'Архив']

/** Табы набора, первый — активный. */
const tabItems = () =>
	TABS.map((text, index) =>
		h(TabsItem, { key: text, value: String(index), text, active: index === 0 }),
	)

describe('Tabs — список с заданной стороны от панели', () => {
	type TSide = 'top' | 'left' | 'right'

	/**
	 * Сторона — только у вертикальных (`position` горизонтальным модификатора
	 * не даёт): горизонтальный список всегда над панелью. Вертикальный у
	 * начала строки — слева в LTR и справа в RTL, у конца — наоборот.
	 */
	const CASES: readonly {
		orientation: TTabsOrientation
		position: TTabsPosition
		dir: 'ltr' | 'rtl'
		side: TSide
	}[] = [
		{ orientation: 'horizontal', position: 'start', dir: 'ltr', side: 'top' },
		{ orientation: 'horizontal', position: 'end', dir: 'ltr', side: 'top' },
		{ orientation: 'horizontal', position: 'start', dir: 'rtl', side: 'top' },
		{ orientation: 'vertical', position: 'start', dir: 'ltr', side: 'left' },
		{ orientation: 'vertical', position: 'end', dir: 'ltr', side: 'right' },
		{ orientation: 'vertical', position: 'start', dir: 'rtl', side: 'right' },
		{ orientation: 'vertical', position: 'end', dir: 'rtl', side: 'left' },
	]

	/** Где список относительно панели на экране. */
	const SIDES: Record<TSide, (list: DOMRect, panel: DOMRect) => boolean> = {
		top: (list, panel) => list.bottom <= panel.top + EPSILON,
		left: (list, panel) => list.right <= panel.left + EPSILON,
		right: (list, panel) => panel.right <= list.left + EPSILON,
	}

	it.each(CASES)(
		'$orientation, position $position, $dir: список — $side от панели, табы — по оси ориентации',
		async ({ orientation, position, dir, side }) => {
			await show(
				() =>
					h(
						Tabs,
						{ orientation, position },
						{
							default: tabItems,
							content: () => h(TabsContent, { value: '0' }, () => 'Панель'),
						},
					),
				dir,
			)

			const list = box(find('.so-tabs__list'))
			const panel = box(find('.so-tabs__panel'))

			expect(SIDES[side](list, panel), `список — ${side} от панели`).toBe(true)

			const items = [...document.querySelectorAll('.so-tabs__list > .so-tabs-item')].map(box)

			expect(items).toHaveLength(TABS.length)

			for (let index = 1; index < items.length; index++) {
				const [prev, next] = [items[index - 1], items[index]]

				if (orientation === 'vertical') {
					// Столбцом: следующий таб — под предыдущим
					expect(next.top, `таб ${index + 1} — под таб ${index}`).toBeGreaterThan(
						prev.bottom - EPSILON,
					)
				} else {
					// В строку по её направлению: в LTR следующий — правее, в RTL — левее
					expect(
						Math.abs(next.top - prev.top),
						`таб ${index + 1} — в строке`,
					).toBeLessThanOrEqual(EPSILON)
					expect(
						dir === 'ltr' ? next.left : prev.left,
						`таб ${index + 1} — после таба ${index}`,
					).toBeGreaterThan((dir === 'ltr' ? prev.right : next.right) - EPSILON)
				}
			}
		},
	)
})

describe('Tabs — слоты списка у краёв строки', () => {
	/**
	 * Слоты встают в ряду первым и последним, а свободное место строки забирает
	 * поле `trailing` со стороны начала строки: он стоит у конца списка, а не
	 * вплотную к последнему табу. В RTL конец строки — слева.
	 */
	it.each(['ltr', 'rtl'] as const)(
		'%s: leading — у начала, trailing — у конца, табы между ними',
		async (dir) => {
			await show(
				() =>
					h(Tabs, null, {
						leading: () => mark('leading'),
						default: tabItems,
						trailing: () => mark('trailing'),
					}),
				dir,
			)

			const list = box(find('.so-tabs__list'))
			const leading = box(find('.so-tabs__list--leading'))
			const trailing = box(find('.so-tabs__list--trailing'))
			const items = [...document.querySelectorAll('.so-tabs__list > .so-tabs-item')].map(box)

			expect(items).toHaveLength(TABS.length)
			expect(edges(dir, list, leading).start, 'leading у начала').toBeLessThanOrEqual(EPSILON)
			expect(edges(dir, list, trailing).end, 'trailing у конца').toBeLessThanOrEqual(EPSILON)
			expect(after(dir, leading, items[0]), 'табы после leading').toBe(true)
			expect(after(dir, items[items.length - 1], trailing), 'trailing после табов').toBe(true)
		},
	)
})

describe('Tags — ряд scroll', () => {
	/** Тегов заведомо больше, чем влезает в узкий ряд. */
	const TAGS = ['Москва', 'Санкт-Петербург', 'Екатеринбург', 'Новосибирск', 'Владивосток']

	const tags = () =>
		h('div', { style: 'width: 260px' }, [
			h(Tags, {
				overflow: 'scroll',
				mode: 'single',
				items: TAGS.map((text) => ({ value: text, text })),
			}),
		])

	const row = () => find('.so-tags')
	const items = () => [...row().querySelectorAll<HTMLElement>(':scope > .so-tags-item')]

	/** Все теги в ряду: отрисовка идёт кадрами, поэтому через poll. */
	const settled = () => expect.poll(() => items().length).toBe(TAGS.length)

	/**
	 * Окно ряда — его паддинг-бокс без отступа прокрутки по строке: в него тег
	 * под фокусом доводит плагин ряда (`TTagsScrollPlugin`).
	 */
	function windowOf(element: HTMLElement): { left: number; right: number } {
		const style = getComputedStyle(element)
		const left = box(element).left + element.clientLeft

		return {
			left: left + parseFloat(style.scrollPaddingLeft),
			right: left + element.clientWidth - parseFloat(style.scrollPaddingRight),
		}
	}

	it('теги — одной строкой, ряд прокручивается вбок', async () => {
		await show(tags)
		await settled()

		const [first, ...rest] = items().map(box)

		for (const item of rest) expect(Math.abs(item.top - first.top)).toBeLessThanOrEqual(EPSILON)

		expect(row().scrollWidth, 'ряду тесно').toBeGreaterThan(row().clientWidth)

		row().scrollLeft = row().scrollWidth

		expect(row().scrollLeft, 'ряд прокрутился').toBeGreaterThan(0)
	})

	/**
	 * Стрелка переводит фокус на тег у края ряда, видимый частично, — и тег
	 * встаёт в окно целиком. Окно уже паддинг-бокса на запас под кольцо фокуса:
	 * тег встаёт не вплотную к краю.
	 */
	it('тег под фокусом с клавиатуры встаёт в окно ряда целиком', async () => {
		await show(tags)
		await settled()

		const area = windowOf(row())
		const cut = items().findIndex((item) => box(item).right > area.right + EPSILON)
		const target = items()[cut]

		if (!target || cut === 0) throw new Error('у конца ряда нет тега, видимого частично')

		// Вход в набор — на первый тег, дальше — стрелками до соседа срезанного
		await userEvent.keyboard('{Tab}')

		for (let step = 1; step < cut; step++) await userEvent.keyboard('{ArrowRight}')

		expect(row().scrollLeft, 'по видимым тегам ряд стоит').toBe(0)

		await userEvent.keyboard('{ArrowRight}')

		expect(target.contains(document.activeElement), 'фокус на срезанном теге').toBe(true)
		expect(row().scrollLeft, 'ряд докрутил тег').toBeGreaterThan(0)

		const view = windowOf(row())
		const tag = box(target)

		expect(view.right, 'окно уже ряда на запас').toBeLessThan(
			box(row()).left + row().clientLeft + row().clientWidth,
		)
		expect(tag.left).toBeGreaterThanOrEqual(view.left - EPSILON)
		expect(tag.right).toBeLessThanOrEqual(view.right + EPSILON)
	})
})

describe('Input — слоты у краёв, ввод между ними', () => {
	it.each(['ltr', 'rtl'] as const)('%s', async (dir) => {
		await show(
			() =>
				h(
					Input,
					{ style: 'width: 320px' },
					{ leading: () => mark('leading'), trailing: () => mark('trailing') },
				),
			dir,
		)

		const root = box(find('.so-input'))
		const leading = box(find('.so-input__leading'))
		const trailing = box(find('.so-input__trailing'))
		const field = box(find('.so-input > input'))

		// Слоты — у своих краёв: `leading` у начала строки, `trailing` у конца
		expect(edges(dir, root, leading).start, 'leading у начала').toBeLessThanOrEqual(EPSILON)
		expect(edges(dir, root, trailing).end, 'trailing у конца').toBeLessThanOrEqual(EPSILON)

		// Ввод — между ними и забирает всё место
		expect(after(dir, leading, field), 'ввод после leading').toBe(true)
		expect(after(dir, field, trailing), 'trailing после ввода').toBe(true)
		expect(field.width).toBeGreaterThan(root.width / 2)

		// Слоты — по центру коробки, ниже её
		for (const slot of [leading, trailing]) {
			expect(slot.height).toBeLessThan(root.height)
			expect(Math.abs(slot.top - root.top - (root.bottom - slot.bottom))).toBeLessThanOrEqual(
				EPSILON,
			)
		}
	})
})

describe('NumberInput — кнопки шага у конца поля', () => {
	it.each(['ltr', 'rtl'] as const)('%s', async (dir) => {
		await show(
			() => h(NumberInput, { style: 'width: 320px' }, { leading: () => mark('leading') }),
			dir,
		)

		const root = box(find('.so-number-input'))
		const leading = box(find('.so-number-input__leading'))
		const field = box(find('.so-number-input__input'))
		const stepper = box(find('.so-number-input__stepper'))
		const decrement = box(find('.so-number-input__decrement'))
		const increment = box(find('.so-number-input__increment'))

		expect(edges(dir, root, leading).start, 'leading у начала').toBeLessThanOrEqual(EPSILON)
		expect(edges(dir, root, stepper).end, 'кнопки шага у конца').toBeLessThanOrEqual(EPSILON)

		expect(after(dir, leading, field), 'ввод после leading').toBe(true)
		expect(after(dir, field, stepper), 'кнопки после ввода').toBe(true)

		// «Меньше», затем «больше» — вдоль строки число растёт к её концу
		expect(after(dir, decrement, increment), '«больше» после «меньше»').toBe(true)

		// Кнопки — квадраты в строку слота, ниже коробки
		for (const button of [decrement, increment]) {
			expect(Math.abs(button.width - button.height)).toBeLessThanOrEqual(EPSILON)
			expect(button.height).toBeLessThan(root.height)
		}
	})
})

describe('Textarea — высоту ведут строки', () => {
	/** Поле многострочного поля. */
	function field(): HTMLTextAreaElement {
		const node = document.querySelector('.so-textarea textarea')

		if (!(node instanceof HTMLTextAreaElement)) throw new Error('поля нет')

		return node
	}

	/** Высота поля в `count` строк: строки и поля текста по вычисленному стилю. */
	function heightOf(count: number): number {
		const style = getComputedStyle(field())

		return (
			count * parseFloat(style.lineHeight) +
			parseFloat(style.paddingTop) +
			parseFloat(style.paddingBottom)
		)
	}

	const height = () => box(field()).height

	it('растёт по строкам до maxRows, на потолке прокручивается', async () => {
		await show(() => h(Textarea, { autoresize: true, rows: 2, maxRows: 4 }))

		// Интерлиньяж — числом: по нему плагин автороста мерит строку
		expect(Number.isNaN(parseFloat(getComputedStyle(field()).lineHeight))).toBe(false)
		expect(height(), 'пустое — rows').toBeCloseTo(heightOf(2), 0)

		field().focus()
		await userEvent.keyboard('1{Enter}2{Enter}3')

		expect(height(), 'три строки').toBeCloseTo(heightOf(3), 0)

		await userEvent.keyboard('{Enter}4{Enter}5{Enter}6')

		expect(height(), 'потолок').toBeCloseTo(heightOf(4), 0)
		expect(field().scrollHeight).toBeGreaterThan(field().clientHeight)
	})

	it.each(COMPONENT_SIZES)('%s: в одну строку — высоты Input', async (size: TComponentSize) => {
		await show(() => [h(Textarea, { rows: 1, size }), h(Input, { size })])

		expect(box(find('.so-textarea')).height).toBeCloseTo(box(find('.so-input')).height, 0)
	})
})

describe('Accordion — место панели', () => {
	const sections = () =>
		h(Accordion, null, () =>
			['a', 'b'].map((value) =>
				h(
					AccordionItem,
					{ key: value, value, text: `Секция ${value}`, class: `so-test-${value}` },
					() => h('p', { class: `so-test-${value}-content` }, 'Содержимое секции'),
				),
			),
		)

	it('свёрнутая панель места не занимает, раскрытая — под заголовком', async () => {
		await show(sections)

		const header = () => box(find('.so-test-a > .so-accordion-item__header'))
		const body = () => box(find('.so-test-a > .so-accordion-item__body'))
		const next = () => box(find('.so-test-b > .so-accordion-item__header'))

		expect(body().height, 'свёрнутая').toBe(0)

		await userEvent.click(find('.so-test-a > .so-accordion-item__header'))
		await nextFrame()

		const content = box(find('.so-test-a-content'))

		expect(body().height, 'раскрытая').toBeGreaterThan(content.height - EPSILON)
		expect(body().top).toBeGreaterThanOrEqual(header().bottom - EPSILON)
		expect(content.top).toBeGreaterThanOrEqual(body().top - EPSILON)
		expect(next().top, 'следующая секция — под панелью').toBeGreaterThanOrEqual(
			body().bottom - EPSILON,
		)
	})
})
