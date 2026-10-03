/**
 * Календарь в настоящем браузере — раскладка и фокус.
 *
 * Здесь то, чего jsdom не считает вовсе. Раскладка: высота месяца под шесть
 * недель при любом месяце — сетка не прыгает при листании, а соседние месяцы
 * стоят вровень, — кольцо фокуса, которое помещается в ячейку дня, и панель
 * выбора месяца и года: накрывает календарь целиком, её шапка — на месте ряда
 * заголовков, список — 4 колонки по 3 строки. Фокус: порядок Tab, `:focus-visible`, клик из Enter на кнопке
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

		// Строки — своей высоты, а не растянуты на шесть недель: плитка не
		// вытянута, а список всё равно во всю панель — его фон накрывает сетки
		expect(height).toBeLessThanOrEqual(width * 1.2)
		expect(
			Math.abs(box('.s-calendar__picker-list').bottom - box('.s-popover__panel').bottom),
		).toBeLessThanOrEqual(
			parseFloat(getComputedStyle(find('.s-calendar__picker-list')).marginBottom) + EPSILON,
		)
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

	/**
	 * Панель — поповер внутри календаря: накрывает его целиком, а её шапка
	 * встаёт ровно на ряд заголовков — стрелки на место кнопок листания, год на
	 * место заголовка, — поэтому при открытии шапка будто не меняется. Размеры
	 * у панели календарные на любом `size`: переменные она берёт у календаря.
	 */
	it.each(['sm', 'normal', 'xl'] as const)(
		'size %s: панель накрывает календарь, шапка — на месте ряда заголовков',
		async (size) => {
			await show({ months: ['2026-09-01'], size })

			const calendar = box('.s-calendar')
			const prev = box('.s-calendar__prev')
			const next = box('.s-calendar__next')
			const title = box('.s-calendar__title')

			await open()

			const heading = box('.s-calendar__picker-heading')

			expectSameBox(box('.s-popover__panel'), calendar)
			expectSameBox(box('.s-calendar__picker-prev'), prev)
			expectSameBox(box('.s-calendar__picker-next'), next)
			expect(Math.abs(heading.top - title.top)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(heading.height - title.height)).toBeLessThanOrEqual(EPSILON)
			expect(
				Math.abs(heading.left + heading.width / 2 - (title.left + title.width / 2)),
			).toBeLessThanOrEqual(EPSILON)
		},
	)

	it('ни рамки, ни тени: панель и список не отделены от календаря', async () => {
		await show({ months: ['2026-09-01'] })
		await open()

		const panel = getComputedStyle(find('.s-popover__panel'))
		const list = getComputedStyle(find('.s-calendar__picker-list'))
		// Тень и кромка-кольцо — слои \`box-shadow\`; снятые, они остаются слоями
		// нулевого размера, и видимых среди них нет
		const lengths = panel.boxShadow.match(/-?\d+(\.\d+)?px/g) ?? []

		expect(lengths.every((length) => parseFloat(length) === 0)).toBe(true)
		expect(list.borderTopWidth).toBe('0px')
		expect(list.borderLeftWidth).toBe('0px')
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
