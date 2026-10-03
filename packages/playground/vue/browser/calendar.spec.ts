/**
 * Календарь в настоящем браузере — раскладка и фокус.
 *
 * Здесь то, чего jsdom не считает вовсе. Раскладка: высота месяца под шесть
 * недель при любом месяце — сетка не прыгает при листании, а соседние месяцы
 * стоят вровень, — кольцо фокуса, которое помещается в ячейку дня, и панель
 * выбора месяца и года: под заголовком, шапка над списком, список — 4 колонки
 * по 3 строки. Фокус: порядок Tab, `:focus-visible`, клик из Enter на кнопке
 * листания, перенос DOM-фокуса за фокусом коллекции, когда узел нового дня
 * появляется кадром позже, и путь фокуса через панель выбора. Модель проверяет ядро, клавиши — тест плагина, проводку —
 * `ui/vue/__tests__/calendar.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Calendar } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Календарь между двумя кнопками — чтобы было откуда войти по Tab и куда
 * уйти. Узел корня плагины получают кадром позже, дни — ещё позже владельца.
 */
const show = async (props: Record<string, unknown>, dir: 'ltr' | 'rtl' = 'ltr') => {
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

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
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

	/** Открыть панель нажатием на заголовок и дождаться её на экране. */
	const open = async () => {
		await userEvent.click(find('.s-calendar__title'))
		await expect.poll(() => options().length).toBe(12)
		await nextFrame()
	}

	/** 12 опций — 4 колонки по 3 строки, шапка над списком, панель под заголовком. */
	const expectGrid = () => {
		const boxes = options().map((option) => option.getBoundingClientRect())
		const list = find('.s-calendar__picker-list').getBoundingClientRect()
		const header = find('.s-calendar__picker-header').getBoundingClientRect()
		const title = find('.s-calendar__title').getBoundingClientRect()

		expect(distinct(boxes.map((box) => box.left))).toHaveLength(4)
		expect(distinct(boxes.map((box) => box.top))).toHaveLength(3)
		expect(distinct(boxes.map((box) => box.width))).toHaveLength(1)
		expect(header.bottom).toBeLessThanOrEqual(list.top + EPSILON)
		expect(header.top).toBeGreaterThanOrEqual(title.bottom - EPSILON)
	}

	it('месяцы — 4 колонки по 3 строки, шапка над списком, панель под заголовком', async () => {
		await show({ months: ['2026-09-01'], locale: 'ru-RU' })
		await open()

		expectGrid()
	})

	it('годы — так же: 4 колонки по 3 строки, и подписи th-TH не режутся', async () => {
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
})
