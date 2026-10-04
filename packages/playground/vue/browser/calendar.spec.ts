/**
 * Календарь в настоящем браузере — раскладка и фокус.
 *
 * Здесь то, чего jsdom не считает вовсе. Раскладка: высота месяца под шесть
 * недель при любом месяце — сетка не прыгает при листании, а соседние месяцы
 * стоят вровень, — кольцо фокуса, которое помещается в ячейку дня, и панель
 * выбора месяца и года: подложка во весь календарь и карточка у её верхнего
 * края — во всю ширину при любом числе сеток, высотой по содержимому, полоса
 * жеста у её низа, кромка в режиме принудительных цветов, — список 4 колонки по 3
 * строки и подписи, которые не рвут слово. Фокус: порядок Tab,
 * `:focus-visible`, клик из Enter на кнопке листания, перенос DOM-фокуса за
 * фокусом коллекции, когда узел нового дня появляется кадром позже, и путь
 * фокуса через панель выбора — в том числе после нажатия по подложке и жеста.
 * Модель проверяет ядро, клавиши и указатель — тесты плагинов, проводку —
 * `ui/vue/__tests__/calendar.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Calendar } from '@soldy-ui/vue'
import { createEngineCalendar } from '@soldy-ui/core'
import type { TSwipe } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { outlined, pixel, style, systemColor } from './colors'
import { DIRECTION_CASES, pointing, setDir, sidesOf, type TLine } from './directions'
import { forcedColors } from './media'
import { transitioning, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Зона захвата полосы жеста — не меньше 24px: минимум цели по WCAG 2.5.8. */
const GRIP_ZONE = 24

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Календарь между двумя кнопками — чтобы было откуда войти по Tab и куда
 * уйти. Узел корня плагины получают кадром позже, дни — ещё позже владельца.
 * `dir` — направление узла, в котором стоит календарь.
 */
const show = async (props: Record<string, unknown>, dir?: TLine) => {
	render(
		defineComponent({
			render: () =>
				h('div', { class: 's-host', dir }, [
					h('button', { class: 's-test-before' }, 'До'),
					h(Calendar, props),
					h('button', { class: 's-test-after' }, 'После'),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const findAll = (selector: string): HTMLElement[] =>
	[...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/** Ячейка дня по дате — по его имени, полной дате, как её прочтёт скринридер. */
const dayCell = (date: string): HTMLElement => {
	const [year, month, day] = date.split('-').map(Number)
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(year, month - 1, day),
	)

	return find(`.s-calendar-item[aria-label="${label}"]`)
}

const titles = () => findAll('.s-calendar__title').map((title) => title.textContent?.trim())

const tab = () => userEvent.keyboard('{Tab}')

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	// Три месяца в ряд: на узком окне они переносятся
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
	setDir(document.documentElement)
})

describe('высота месяца', () => {
	/**
	 * Февраль 2026 с воскресенья — ровно четыре недели, август — шесть. Ряд
	 * заголовков у соседей один, и недели у них стоят вровень, только если
	 * месяц держит место под шесть недель при любой своей длине.
	 */
	it('месяцы в четыре и шесть недель одной высоты', async () => {
		await show({ months: ['2026-02-01', '2026-08-01'] })

		const [february, august] = findAll('.s-calendar__month')

		expect(february.querySelectorAll('.s-calendar__week')).toHaveLength(4)
		expect(august.querySelectorAll('.s-calendar__week')).toHaveLength(6)
		expect(
			Math.abs(
				february.getBoundingClientRect().height - august.getBoundingClientRect().height,
			),
		).toBeLessThanOrEqual(EPSILON)
	})

	it('листание по месяцам разной длины не меняет высоту календаря', async () => {
		await show({ months: ['2026-02-01'] })

		const root = find('.s-calendar')
		const height = root.getBoundingClientRect().height

		// Март — пять недель, апрель — пять, май — шесть
		for (const title of ['March 2026', 'April 2026', 'May 2026']) {
			find('.s-calendar__next').click()
			await expect.poll(titles).toEqual([title])

			expect(Math.abs(root.getBoundingClientRect().height - height)).toBeLessThanOrEqual(
				EPSILON,
			)
		}
	})
})

describe('кольцо фокуса', () => {
	/**
	 * Кольцо рисует плитка дня, ячейка шире её на запас. Соседние дни стоят
	 * вплотную, и кольцо, вышедшее за ячейку, легло бы на соседа.
	 */
	it('кольцо дня помещается в его ячейку', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-test-before').focus()
		await tab()
		await tab()
		await tab()
		await tab()

		const cell = dayCell('2026-09-16')

		expect(document.activeElement).toBe(cell)

		const tile = cell.querySelector('.s-calendar-item__day')

		if (!tile) throw new Error('у дня нет плитки')

		const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(tile)
		const ring = parseFloat(outlineWidth) + parseFloat(outlineOffset)
		const box = tile.getBoundingClientRect()
		const room = cell.getBoundingClientRect()

		expect(outlineStyle).not.toBe('none')
		expect(parseFloat(outlineWidth)).toBeGreaterThan(0)
		expect(box.left - ring).toBeGreaterThanOrEqual(room.left - EPSILON)
		expect(box.right + ring).toBeLessThanOrEqual(room.right + EPSILON)
		expect(box.top - ring).toBeGreaterThanOrEqual(room.top - EPSILON)
		expect(box.bottom + ring).toBeLessThanOrEqual(room.bottom + EPSILON)
	})
})

describe('фокус', () => {
	it('Tab проходит «назад», «вперёд», заголовки месяцев и одну остановку на все сетки', async () => {
		await show({ months: ['2026-09-01', '2026-10-01'], value: '2026-10-05' })

		const [september, october] = findAll('.s-calendar__title')

		find('.s-test-before').focus()

		await tab()
		expect(document.activeElement).toBe(find('.s-calendar__prev'))

		await tab()
		expect(document.activeElement).toBe(find('.s-calendar__next'))

		await tab()
		expect(document.activeElement).toBe(september)

		await tab()
		expect(document.activeElement).toBe(october)

		await tab()
		expect(document.activeElement).toBe(dayCell('2026-10-05'))

		await tab()
		expect(document.activeElement).toBe(find('.s-test-after'))
	})

	it('стрелки ведут фокус по дням, в RTL ← — к следующему дню', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' }, 'rtl')

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{ArrowLeft}')

		expect(document.activeElement).toBe(dayCell('2026-09-17'))

		await userEvent.keyboard('{ArrowDown}')

		expect(document.activeElement).toBe(dayCell('2026-09-24'))
	})

	it('PageDown уводит сетку в следующий месяц, фокус — на день нового месяца', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		dayCell('2026-09-16').focus()
		await userEvent.keyboard('{PageDown}')

		await expect.poll(titles).toEqual(['October 2026'])
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})

	it('Enter на кнопке листает, и фокус остаётся на ней', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(document.activeElement).toBe(find('.s-calendar__next'))
	})

	/**
	 * Выключенная кнопка фокус теряет, и он упал бы на страницу. Плагин
	 * переводит его на остановку сетки — день, куда уехал фокус коллекции.
	 */
	it('кнопка погасла у границы под фокусом — фокус на день сетки', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16', max: '2026-10-31' })

		find('.s-calendar__next').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(titles).toEqual(['October 2026'])
		expect(find('.s-calendar__next').hasAttribute('disabled')).toBe(true)
		await expect.poll(() => document.activeElement).toBe(dayCell('2026-10-16'))
	})
})

/**
 * Стрелки — то, что тема зеркалит сама: роль иконки одна, `arrowRight`, а у
 * стрелки нет логических направлений. Знак тема берёт у ближайшего `dir`, как
 * браузер — направленность раскладки, поэтому календарь с `direction="ltr"` в
 * RTL-предке остаётся календарём LTR целиком (`browser/directions.ts`). Панель
 * выбора месяца и года лежит в календаре, и её стрелки идут за ним.
 */
describe.each(DIRECTION_CASES)('стрелки по ближайшему dir: $name', (scenario) => {
	const { start, end } = sidesOf(scenario.line)

	it('«назад» смотрит в начало строки, «вперёд» — в конец: у листания и в панели выбора', async () => {
		setDir(document.documentElement, scenario.page)
		await show({ months: ['2026-09-01'], direction: scenario.direction }, scenario.ancestor)

		expect(pointing('.s-calendar__prev'), 'листание «назад»').toBe(start)
		expect(pointing('.s-calendar__next'), 'листание «вперёд»').toBe(end)

		await userEvent.click(find('.s-calendar__title'))
		await expect
			.poll(() => findAll('.s-calendar__picker-list .s-list-box-item').length)
			.toBe(12)

		expect(pointing('.s-calendar__picker-prev'), 'панель «назад»').toBe(start)
		expect(pointing('.s-calendar__picker-next'), 'панель «вперёд»').toBe(end)
	})
})

describe('указатель', () => {
	it('предпросмотр диапазона идёт за указателем', async () => {
		await show({ months: ['2026-09-01'], value: undefined, mode: 'range' })

		await userEvent.click(dayCell('2026-09-10'))
		await userEvent.hover(dayCell('2026-09-13'))

		await expect.poll(() => findAll('.s-calendar-item[data-preview="true"]').length).toBe(4)

		await userEvent.click(dayCell('2026-09-13'))

		await expect
			.poll(() => findAll('.s-calendar-item[data-range-middle="true"]').length)
			.toBe(2)
		expect(findAll('.s-calendar-item[data-preview="true"]')).toHaveLength(0)
	})
})

describe('выбор месяца и года', () => {
	const options = () => findAll('.s-calendar__picker-list .s-list-box-item')

	/** Различные значения, с допуском на субпиксели. */
	const distinct = (values: number[]) =>
		values.reduce<number[]>(
			(found, value) =>
				found.some((known) => Math.abs(known - value) <= EPSILON)
					? found
					: [...found, value],
			[],
		)

	/** Переходы панели — её и карточки внутри — доиграли: геометрия на месте. */
	const settled = async () => {
		await nextFrame()
		await Promise.all(
			find('.s-popover__panel')
				.getAnimations({ subtree: true })
				.map((animation) => animation.finished),
		)
	}

	/** Открыть панель нажатием на заголовок и дождаться её на месте. */
	const open = async () => {
		await userEvent.click(find('.s-calendar__title'))
		await expect.poll(() => options().length).toBe(12)
		await settled()
	}

	/** Прямоугольник узла по селектору. */
	const box = (selector: string) => find(selector).getBoundingClientRect()

	/** Те же место и размер — с допуском на субпиксели. */
	const expectSameBox = (actual: DOMRect, expected: DOMRect) => {
		for (const side of ['left', 'top', 'width', 'height'] as const) {
			expect(Math.abs(actual[side] - expected[side])).toBeLessThanOrEqual(EPSILON)
		}
	}

	/** Строка опции и область её подписи. */
	const rowOf = (option: HTMLElement) => {
		const row = option.querySelector(':scope > .s-button')
		const text = row?.querySelector(':scope > .s-button__text')

		if (!(row instanceof HTMLElement) || !(text instanceof HTMLElement)) {
			throw new Error('у опции нет строки с подписью')
		}

		return { row, text }
	}

	/** Прямоугольник самих строк подписи, а не её области: область — во всю строку. */
	const labelBox = (text: HTMLElement) => {
		const range = document.createRange()

		range.selectNodeContents(text)

		return range.getBoundingClientRect()
	}

	/** Шаги между соседними значениями по возрастанию. */
	const steps = (values: number[]) =>
		[...values]
			.sort((a, b) => a - b)
			.flatMap((value, i, sorted) => (i ? [value - sorted[i - 1]] : []))

	/**
	 * 12 опций — 4 колонки по 3 строки, шапка над списком. Ячейки поровну по
	 * ширине и высоте, строка — во всю ячейку, между строками — один небольшой
	 * зазор по обеим осям, подпись — по центру строки по обеим осям.
	 */
	const expectGrid = () => {
		const items = options()
		const boxes = items.map((option) => option.getBoundingClientRect())
		const lefts = distinct(boxes.map((option) => option.left))
		const tops = distinct(boxes.map((option) => option.top))

		expect(lefts).toHaveLength(4)
		expect(tops).toHaveLength(3)
		expect(distinct(boxes.map((option) => option.width))).toHaveLength(1)
		expect(distinct(boxes.map((option) => option.height))).toHaveLength(1)

		const [{ width, height }] = boxes

		// Строки — своей высоты: плитка не вытянута
		expect(height).toBeLessThanOrEqual(width * 1.2)

		const gaps = [
			...steps(lefts).map((step) => step - width),
			...steps(tops).map((step) => step - height),
		]

		expect(distinct(gaps)).toHaveLength(1)
		expect(gaps[0]).toBeGreaterThan(0)
		expect(gaps[0]).toBeLessThan(Math.min(width, height) / 4)

		for (const option of items) {
			const cell = option.getBoundingClientRect()
			const { row, text } = rowOf(option)
			const label = labelBox(text)

			expectSameBox(row.getBoundingClientRect(), cell)
			expect(
				Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
			).toBeLessThanOrEqual(1)
			expect(
				Math.abs(label.top + label.height / 2 - (cell.top + cell.height / 2)),
			).toBeLessThanOrEqual(1)
		}

		expect(box('.s-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.s-calendar__picker-list').top + EPSILON,
		)
	}

	/** Отступ карточки по вертикали и по строке — один, два запаса. */
	const padding = () => parseFloat(getComputedStyle(find('.s-calendar__picker')).paddingTop)

	/**
	 * Открыть панель с жестом или без. Жест включает расширение `picker` у
	 * поповера места; выключают его тем же поповером — из выхода `pickers`
	 * движка, переданного календарю.
	 */
	const openWith = async (props: Record<string, unknown>, swipe: TSwipe) => {
		const engine = createEngineCalendar()

		await show({ months: ['2026-09-01'], ...props, engine })

		for (const picker of engine.extensions.picker.pickers) picker.popover.swipe = swipe

		await open()
	}

	/**
	 * Подложка — сама панель во весь календарь, а выбирают в карточке: она
	 * выезжает сверху, как выезжающая панель, — от верхнего края календаря и во
	 * всю его ширину. Меняется только низ: высота карточки — по содержимому,
	 * шапка над списком, под списком — отступ или полоса жеста, — и под ней
	 * видно подложку с последними неделями месяца.
	 */
	const expectCard = () => {
		const calendar = box('.s-calendar')
		const card = box('.s-calendar__picker')

		expectSameBox(box('.s-popover__panel'), calendar)
		expect(Math.abs(card.top - calendar.top)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.left - calendar.left)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(card.right - calendar.right)).toBeLessThanOrEqual(EPSILON)
		expect(calendar.bottom - card.bottom).toBeGreaterThan(box('.s-calendar__weekday').height)
		expect(box('.s-calendar__picker-header').bottom).toBeLessThanOrEqual(
			box('.s-calendar__picker-list').top + EPSILON,
		)
	}

	describe.each(COMPONENT_SIZES)('карточка, size %s', (size) => {
		it('с полосой жеста: полоса у низа карточки, во всю её ширину, список не накрывает', async () => {
			await openWith({ size }, 'handle')

			expectCard()

			const card = box('.s-calendar__picker')
			const list = box('.s-calendar__picker-list')
			const grip = box('.s-popover__handle')

			expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
			expect(Math.abs(grip.bottom - card.bottom)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.left - card.left)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.width - card.width)).toBeLessThanOrEqual(EPSILON)
			expect(grip.top).toBeGreaterThanOrEqual(list.bottom - EPSILON)
		})

		it('без полосы: под списком — отступ карточки', async () => {
			await openWith({ size }, 'none')

			expectCard()

			const under = box('.s-calendar__picker').bottom - box('.s-calendar__picker-list').bottom

			expect(document.querySelector('.s-popover__handle')).toBeNull()
			expect(Math.abs(under - padding())).toBeLessThanOrEqual(EPSILON)
		})
	})

	/**
	 * Карточка — одна на весь календарь, сколько бы сеток он ни показывал:
	 * подложка накрывает все, карточка — во всю ширину календаря у его верхнего
	 * края.
	 */
	it('три сетки — карточка во всю ширину календаря, у верхнего края', async () => {
		await show({ months: ['2026-08-01', '2026-09-01', '2026-10-01'] })
		await open()

		// Три месяца стоят в ряд — иначе проверять нечего
		expect(
			distinct(findAll('.s-calendar__month').map((month) => month.offsetTop)),
		).toHaveLength(1)
		expectCard()
	})

	/**
	 * Тень и кромка-кольцо — слои `box-shadow`. У подложки они сняты и
	 * остаются слоями нулевого размера, у карточки видны: карточка — та же
	 * семья, что панели оверлеев.
	 */
	it('кольцо и тень — у карточки, у подложки ни кромки, ни тени', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const lengths = (selector: string) =>
			(style(find(selector)).boxShadow.match(/-?\d+(\.\d+)?px/g) ?? []).map(parseFloat)

		expect(lengths('.s-popover__panel').every((length) => length === 0)).toBe(true)
		expect(lengths('.s-calendar__picker').some((length) => length !== 0)).toBe(true)
		expect(outlined(find('.s-popover__panel'))).toBe(false)
		expect(outlined(find('.s-calendar__picker'))).toBe(false)
		expect(style(find('.s-calendar__picker-list')).borderTopWidth).toBe('0px')
	})

	it.each(['sm', 'normal', 'xl'] as const)(
		'size %s: месяцы — 4×3 ровными ячейками с зазором, подпись по центру, шапка над списком',
		async (size) => {
			await show({ months: ['2026-09-01'], locale: 'ru-RU', size })
			await open()

			expectGrid()
		},
	)

	it('годы — так же ровной сеткой 4×3, и подписи th-TH с эрой не режутся', async () => {
		await show({ months: ['2026-09-01'], locale: 'th-TH' })
		await open()

		await userEvent.click(find('.s-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).not.toBe(undefined)
		await nextFrame()

		expectGrid()

		for (const text of findAll('.s-calendar__picker-list .s-button__text')) {
			expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth)
		}
	})

	/** Слова подписи, которые разошлись по двум строкам. */
	const brokenWords = (text: HTMLElement): string[] =>
		[...text.childNodes].flatMap((node) =>
			node instanceof Text
				? [...node.data.matchAll(/\S+/g)].flatMap((match) => {
						const range = document.createRange()

						range.setStart(node, match.index)
						range.setEnd(node, match.index + match[0].length)

						const lines = distinct([...range.getClientRects()].map((rect) => rect.top))

						return lines.length > 1 ? [match[0]] : []
					})
				: [],
		)

	/**
	 * Подпись переносится только между словами, а слово не рвёт. Слово шире
	 * области текста заходит в поля строки поровну с обеих сторон — подпись
	 * остаётся по центру, — но из плитки не выходит. У `ar-EG` такое слово —
	 * «أغسطس», и шире области оно на любом размере.
	 */
	it.each(COMPONENT_SIZES)(
		'size %s: ar-EG — слова подписей целы, подпись по центру и в своей плитке',
		async (size) => {
			await show({ months: ['2026-09-01'], locale: 'ar-EG', size })
			await open()

			for (const option of options()) {
				const { row, text } = rowOf(option)
				const cell = row.getBoundingClientRect()
				const label = labelBox(text)

				expect(brokenWords(text), text.textContent ?? '').toEqual([])
				expect(label.left).toBeGreaterThanOrEqual(cell.left - EPSILON)
				expect(label.right).toBeLessThanOrEqual(cell.right + EPSILON)
				expect(
					Math.abs(label.left + label.width / 2 - (cell.left + cell.width / 2)),
				).toBeLessThanOrEqual(1)
			}
		},
	)

	/**
	 * Мышью целиком: выбор года пересобирает список под месяцы, и Vue
	 * перерисовывает его между обработчиками того же клика — до корня поповера
	 * клик доходит с целью, которой в панели уже нет. Панель остаётся открытой.
	 */
	it('мышью: год — снова месяцы этого года, панель открыта; месяц — закрывает и ставит месяц', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const tile = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return rowOf(option).row
		}

		await userEvent.click(find('.s-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		await userEvent.click(tile('2024'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('Jan')
		await nextFrame()

		expect(find('.s-popover__panel').checkVisibility()).toBe(true)
		expect(find('.s-calendar__picker-heading').textContent?.trim()).toBe('2024')

		await userEvent.click(tile('Mar'))

		await expect.poll(titles).toEqual(['March 2024'])
		await expect.poll(() => find('.s-popover__panel').checkVisibility()).toBe(false)
	})

	it('указатель — рука на месяцах и годах, у выключенных вне границ — обычный', async () => {
		await show({ months: ['2026-09-01'], min: '2026-03-01', max: '2026-10-31' })
		await open()

		/** Указатель над плиткой с подписью. */
		const cursorOf = (label: string) => {
			const option = options().find((item) => item.textContent?.trim() === label)

			if (!option) throw new Error(`${label}: плитки нет`)

			return getComputedStyle(rowOf(option).row).cursor
		}

		expect(cursorOf('Mar')).toBe('pointer')
		expect(cursorOf('Oct')).toBe('pointer')
		expect(cursorOf('Feb')).not.toBe('pointer')
		expect(cursorOf('Nov')).not.toBe('pointer')

		await userEvent.click(find('.s-calendar__picker-heading'))
		await expect.poll(() => options()[0]?.textContent?.trim()).toBe('2017')

		expect(cursorOf('2026')).toBe('pointer')
		expect(cursorOf('2025')).not.toBe('pointer')
	})

	it('клавиатура: Enter на заголовке — фокус на список, ↓ и Enter выбирают, фокус — на заголовок', async () => {
		await show({ months: ['2026-09-01'], value: '2026-09-16' })

		find('.s-calendar__title').focus()
		await userEvent.keyboard('{Enter}')

		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__picker-list'))

		await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')

		await expect.poll(titles).toEqual(['November 2026'])
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
	})

	it('Escape закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.keyboard('{Escape}')

		await expect
			.poll(() => find('.s-calendar__title').getAttribute('aria-expanded'))
			.toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/** Точка подложки под карточкой — в координатах панели. */
	const underCard = () => {
		const panel = box('.s-popover__panel')
		const card = box('.s-calendar__picker')

		return {
			x: card.left + card.width / 2 - panel.left,
			y: (card.bottom + panel.bottom) / 2 - panel.top,
		}
	}

	const expanded = () => find('.s-calendar__title').getAttribute('aria-expanded')

	/**
	 * Подложку видно под карточкой: нажатие по ней закрывает панель, как
	 * Escape, — фокус возвращается на заголовок, а не падает на страницу.
	 */
	it('нажатие по подложке закрывает панель, фокус — на заголовок, месяц прежний', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		await userEvent.click(find('.s-popover__panel'), { position: underCard() })

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
		expect(titles()).toEqual(['September 2026'])
	})

	/**
	 * Нажали в карточке, отпустили на подложке — браузер отдаёт `click` их
	 * общему предку, самой панели. Это не нажатие по подложке: панель открыта.
	 */
	it('протяжка из карточки на подложку панель не закрывает', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = find('.s-calendar__picker')
		const { width } = card.getBoundingClientRect()

		await userEvent.dragAndDrop(card, find('.s-popover__panel'), {
			sourcePosition: { x: width / 2, y: 2 },
			targetPosition: underCard(),
		})
		await nextFrame()

		expect(expanded()).toBe('true')
	})

	/**
	 * Жест — за полосу у низа карточки, вверх: карточка выехала сверху и уходит
	 * туда же. Подложка стоит, а карточка с полосой идёт за указателем — уедь
	 * подложка с ней, и она вылезла бы за календарь. Отпущенная, не смахнув,
	 * карточка возвращается на место.
	 */
	it('протяжка за полосу вверх тянет карточку, подложка стоит; отпущенная — на место', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const panel = box('.s-popover__panel')
		const card = box('.s-calendar__picker')
		const grip = find('.s-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		await userEvent.hover(grip, { position: { x: width / 2, y: height / 2 } })
		await commands.mouseDown()

		try {
			await userEvent.hover(grip, {
				position: { x: width / 2, y: height / 2 - 30 },
				force: true,
			})
			await nextFrame()

			expect(Math.abs(box('.s-calendar__picker').top - card.top + 30)).toBeLessThanOrEqual(1)
			expectSameBox(box('.s-popover__panel'), panel)
		} finally {
			await commands.mouseUp()
		}

		await expect
			.poll(() => Math.abs(box('.s-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)
		expect(expanded()).toBe('true')
	})

	/** Протянуть полосу мышью на `dy` по вертикали — настоящими событиями, по шагам. */
	const dragGrip = (dy: number) => {
		const grip = find('.s-popover__handle')
		const { width, height } = grip.getBoundingClientRect()

		// `force`: точка отпускания — за пределами полосы, и проверка попадания
		// Playwright ждала бы, пока полоса окажется под ней
		return userEvent.dragAndDrop(grip, grip, {
			sourcePosition: { x: width / 2, y: height / 2 },
			targetPosition: { x: width / 2, y: height / 2 + dy },
			steps: 10,
			force: true,
		})
	}

	/**
	 * Закрытая панель не пропадает разом: подложка гаснет на месте, а карточка
	 * с полосой уезжает вверх, за край календаря, — смахнутая от места, где её
	 * отпустили, а не вернувшись сначала на место.
	 */
	it('смахнутая карточка уходит вверх, подложка гаснет на месте', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const backdrop = box('.s-popover__panel')
		const start = box('.s-calendar__picker').top

		await dragGrip(-150)

		const tops: number[] = []
		const seen = await whileLeaving(find('.s-popover__panel'), () => {
			expectSameBox(box('.s-popover__panel'), backdrop)
			expect(transitioning(find('.s-popover__panel'))).toContain('opacity')
			tops.push(box('.s-calendar__picker').top)
		})

		expect(seen).toBeGreaterThan(1)
		expect(tops[0]).toBeLessThan(start - EPSILON)

		for (let index = 1; index < tops.length; index += 1) {
			expect(tops[index]).toBeLessThanOrEqual(tops[index - 1] + EPSILON)
		}
	})

	it('жест за полосу вверх закрывает панель, фокус — на заголовок; вниз — нет', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const card = box('.s-calendar__picker')

		await dragGrip(150)
		await expect
			.poll(() => Math.abs(box('.s-calendar__picker').top - card.top) <= EPSILON)
			.toBe(true)

		expect(expanded()).toBe('true')

		await dragGrip(-150)

		await expect.poll(expanded).toBe('false')
		await expect.poll(() => document.activeElement).toBe(find('.s-calendar__title'))
	})

	/**
	 * Выключенная кнопка фокус теряет, и он упал бы на страницу. Плагин
	 * переводит его на список той же панели.
	 */
	it('стрелка погасла у границы лет под фокусом — фокус на список панели', async () => {
		await show({ months: ['2026-09-01'], max: '2027-10-31' })
		await open()

		find('.s-calendar__picker-next').focus()
		await userEvent.keyboard('{Enter}')

		await expect
			.poll(() => find('.s-calendar__picker-heading').textContent?.trim())
			.toBe('2027')
		expect(find('.s-calendar__picker-next').hasAttribute('disabled')).toBe(true)
		expect(document.activeElement).toBe(find('.s-calendar__picker-list'))
	})

	/**
	 * Режим принудительных цветов (высокий контраст Windows): фоны браузер
	 * заменяет цветом поверхности, а тени убирает. Выбранная плитка — строка
	 * ListBox без отметки, выбор у неё виден только фоном, — красится системной
	 * подсветкой; штрих полосы — фон псевдоэлемента — системным цветом текста;
	 * кромка карточки становится рамкой, а вокруг подложки рамки нет.
	 */
	describe('принудительные цвета', () => {
		afterEach(async () => {
			await forcedColors('none')
		})

		it('выбранная плитка — системной подсветкой, штрих полосы виден', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			const tile = style(
				find('.s-calendar__picker-list .s-list-box-item[data-selected="true"] > .s-button'),
			)
			const grip = style(find('.s-popover__handle'), '::before')

			expect(matchMedia('(forced-colors: active)').matches).toBe(true)
			expect(pixel([tile.backgroundColor])).toEqual(pixel([systemColor('Highlight')]))
			expect(pixel([tile.color])).toEqual(pixel([systemColor('HighlightText')]))
			expect(pixel([grip.backgroundColor])).toEqual(pixel([systemColor('CanvasText')]))
			expect(pixel([grip.backgroundColor])).not.toEqual(
				pixel([style(find('.s-calendar__picker')).backgroundColor]),
			)
		})

		it('рамка — у карточки, а не вокруг подложки', async () => {
			await forcedColors('active')
			await show({ months: ['2026-09-01'] })
			await open()

			expect(outlined(find('.s-calendar__picker'))).toBe(true)
			expect(outlined(find('.s-popover__panel'))).toBe(false)
		})
	})
})
