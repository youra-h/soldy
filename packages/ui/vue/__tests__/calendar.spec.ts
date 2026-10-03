/**
 * Calendar во Vue — проводка на настоящей разметке.
 *
 * Модель — сетки, выбор, фокус, листание — проверяет ядро, клавиши и указатель
 * — тесты плагинов, раскладку и фокус в браузере — `playground/vue/browser`.
 * Здесь важно, что выходы коллекции доезжают туда, куда должны: сетки — в
 * таблицы, наборы дня — на его ячейку, выключенность — на кнопки, а нажатия и
 * клавиши на настоящей разметке доходят до модели и возвращаются `v-model`.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { Calendar } from '@soldy-ui/vue'
import { TCalendar } from '@soldy-ui/core'
import type { ICalendarItem, TCalendarValue } from '@soldy-ui/core'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
	vi.useRealTimers()
})

/** Смонтировать и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(content: () => VNode): Promise<void> {
	wrapper = mount(defineComponent({ render: content }), { attachTo: document.body })

	await settle()
}

/** Перерисовка и кадр: новые дни объявляют узлы кадром позже. */
async function settle(): Promise<void> {
	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

function findAll(selector: string): HTMLElement[] {
	return [...document.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)
}

/** Ячейка дня по его имени — полной дате в локали, как её прочтёт скринридер. */
function dayCell(date: string): HTMLElement {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)

	return find(`.s-calendar-item[aria-label="${label}"]`)
}

const titles = () => findAll('.s-calendar__title').map((title) => title.textContent?.trim())
const prev = () => find('.s-calendar__prev')
const next = () => find('.s-calendar__next')

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	from.dispatchEvent(event)

	return event
}

describe('разметка', () => {
	it('кнопки листания стоят до сеток, сетка — таблица с шапкой дней недели', async () => {
		await render(() => h(Calendar))

		const root = find('.s-calendar')

		expect([...root.children].map((node) => node.classList[node.classList.length - 1])).toEqual(
			['s-calendar__prev', 's-calendar__next', 's-calendar__month'],
		)
		expect(findAll('.s-calendar__weekday').map((cell) => cell.textContent?.trim())).toEqual([
			'Sun',
			'Mon',
			'Tue',
			'Wed',
			'Thu',
			'Fri',
			'Sat',
		])
		expect(find('.s-calendar__grid thead').getAttribute('aria-hidden')).toBe('true')
	})

	it('заголовок называет сетку и объявляет смену месяца', async () => {
		await render(() => h(Calendar))

		const title = find('.s-calendar__title-text')
		const grid = find('.s-calendar__grid')

		expect(title.textContent?.trim()).toBe('September 2026')
		expect(title.getAttribute('aria-live')).toBe('polite')
		expect(grid.getAttribute('role')).toBe('grid')
		expect(grid.getAttribute('aria-labelledby')).toBe(title.id)
		expect(title.id).not.toBe('')
	})

	it('день — ячейка с номером и именем; заполнитель — пустая ячейка, скрытая от скринридера', async () => {
		await render(() => h(Calendar))

		const fillers = findAll('.s-calendar__filler')
		const days = findAll('.s-calendar-item')

		// Сентябрь 2026 с воскресенья: 2 дня августа, 3 дня октября
		expect(fillers).toHaveLength(5)
		expect(fillers.every((cell) => cell.getAttribute('aria-hidden') === 'true')).toBe(true)
		expect(fillers.every((cell) => cell.textContent === '')).toBe(true)
		expect(days).toHaveLength(30)
		expect(days.every((cell) => cell.tagName === 'TD')).toBe(true)
		expect(dayCell('2026-09-05').textContent?.trim()).toBe('5')
	})

	it('остановка Tab одна, у дня с фокусом; сегодня отмечено', async () => {
		await render(() => h(Calendar))

		const stops = findAll('.s-calendar-item[tabindex="0"]')

		expect(stops).toEqual([dayCell('2026-09-26')])
		expect(dayCell('2026-09-26').dataset.today).toBe('true')
		expect(dayCell('2026-09-26').getAttribute('aria-current')).toBe('date')
	})

	it('несколько месяцев — сетка на каждый, у каждого свой заголовок', async () => {
		await render(() => h(Calendar, { months: ['2026-01-01', '2026-09-01'] }))

		expect(titles()).toEqual(['January 2026', 'September 2026'])
		expect(findAll('.s-calendar__grid')).toHaveLength(2)
	})

	it('первый день недели по локали: у ru-RU колонки с понедельника', async () => {
		await render(() => h(Calendar, { locale: 'ru-RU' }))

		expect(find('.s-calendar__weekday').textContent?.trim()).toBe(
			new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 21),
			),
		)
	})

	it('слот item — своё содержимое дня; scope — сам день', async () => {
		await render(() =>
			h(Calendar, null, {
				item: ({ item }: { item: ICalendarItem }) =>
					h('span', { class: 's-test-day' }, `${item.text}·${item.date.slice(5)}`),
			}),
		)

		expect(dayCell('2026-09-05').querySelector('.s-test-day')?.textContent).toBe('5·09-05')
	})

	it('без слота день рисует свой номер в плитке', async () => {
		await render(() => h(Calendar))

		expect(
			dayCell('2026-09-05').querySelector('.s-calendar-item__day')?.textContent?.trim(),
		).toBe('5')
	})
})

describe('кнопки листания', () => {
	it('имена — из prevLabel и nextLabel', async () => {
		await render(() => h(Calendar, { prevLabel: 'Назад', nextLabel: 'Вперёд' }))

		expect(prev().getAttribute('aria-label')).toBe('Назад')
		expect(next().getAttribute('aria-label')).toBe('Вперёд')
	})

	it('у границы кнопка гаснет, в другую сторону — нет', async () => {
		await render(() => h(Calendar, { min: '2026-09-10', max: '2026-10-20' }))

		expect(prev().hasAttribute('disabled')).toBe(true)
		expect(next().hasAttribute('disabled')).toBe(false)

		next().click()
		await settle()

		expect(titles()).toEqual(['October 2026'])
		expect(prev().hasAttribute('disabled')).toBe(false)
		expect(next().hasAttribute('disabled')).toBe(true)
	})

	it('выключенный календарь гасит обе кнопки и дни', async () => {
		await render(() => h(Calendar, { disabled: true }))

		expect(prev().hasAttribute('disabled')).toBe(true)
		expect(next().hasAttribute('disabled')).toBe(true)
		expect(find('.s-calendar').dataset.disabled).toBe('true')
		expect(findAll('.s-calendar-item[data-disabled="false"]')).toEqual([])
	})

	it('граница, заданная инстансу, гасит кнопку и без листания', async () => {
		const ctrl = new TCalendar()

		await render(() => h(Calendar, { ctrl }))
		expect(prev().hasAttribute('disabled')).toBe(false)

		ctrl.min = '2026-09-03'
		await settle()

		expect(prev().hasAttribute('disabled')).toBe(true)
	})

	it('листание пишет months — v-model:months', async () => {
		const months = ref<string[] | undefined>(undefined)

		await render(() =>
			h(Calendar, {
				months: months.value,
				'onUpdate:months': (value: string[] | undefined) => {
					months.value = value
				},
			}),
		)

		next().click()
		await settle()

		expect(months.value).toEqual(['2026-10-01'])
		expect(titles()).toEqual(['October 2026'])

		prev().click()
		await settle()

		expect(months.value).toEqual(['2026-09-01'])
	})
})

describe('выбор', () => {
	it('нажатие по дню выбирает его — v-model:value', async () => {
		const value = ref<TCalendarValue>(undefined)

		await render(() =>
			h(Calendar, {
				value: value.value,
				'onUpdate:value': (next: TCalendarValue) => {
					value.value = next
				},
			}),
		)

		dayCell('2026-09-10').click()
		await settle()

		expect(value.value).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset.selected).toBe('true')
		expect(dayCell('2026-09-10').getAttribute('aria-selected')).toBe('true')
		expect(dayCell('2026-09-11').getAttribute('aria-selected')).toBe('false')
	})

	it('значение снаружи выбирает день и уводит сетку на его месяц', async () => {
		const value = ref<TCalendarValue>('2026-09-10')

		await render(() => h(Calendar, { value: value.value }))
		expect(dayCell('2026-09-10').dataset.selected).toBe('true')

		value.value = '2026-11-03'
		await settle()

		expect(titles()).toEqual(['November 2026'])
		expect(dayCell('2026-11-03').dataset.selected).toBe('true')
	})

	it('диапазон: два нажатия — пара дат, между ними — середина', async () => {
		const value = ref<TCalendarValue>(undefined)

		await render(() =>
			h(Calendar, {
				mode: 'range',
				value: value.value,
				'onUpdate:value': (next: TCalendarValue) => {
					value.value = next
				},
			}),
		)

		expect(find('.s-calendar__grid').getAttribute('aria-multiselectable')).toBe('true')

		dayCell('2026-09-14').click()
		dayCell('2026-09-10').click()
		await settle()

		expect(value.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(dayCell('2026-09-10').dataset.rangeStart).toBe('true')
		expect(dayCell('2026-09-12').dataset.rangeMiddle).toBe('true')
		expect(dayCell('2026-09-14').dataset.rangeEnd).toBe('true')
	})

	it('предпросмотр диапазона — до дня под указателем', async () => {
		await render(() => h(Calendar, { mode: 'range' }))

		dayCell('2026-09-10').click()
		dayCell('2026-09-13').dispatchEvent(
			new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }),
		)
		await settle()

		expect(findAll('.s-calendar-item[data-preview="true"]')).toHaveLength(4)
	})

	it('недоступный день не выбирается, но фокус на него встаёт', async () => {
		const value = ref<TCalendarValue>(undefined)
		const unavailable = (date: string) => date === '2026-09-15'

		await render(() =>
			h(Calendar, {
				unavailable,
				value: value.value,
				'onUpdate:value': (next: TCalendarValue) => {
					value.value = next
				},
			}),
		)

		const blocked = dayCell('2026-09-15')

		expect(blocked.dataset.unavailable).toBe('true')
		expect(blocked.getAttribute('aria-disabled')).toBe('true')
		expect(blocked.getAttribute('tabindex')).toBe('-1')

		blocked.click()
		await settle()

		expect(value.value).toBeUndefined()
	})
})

describe('клавиатура', () => {
	it('стрелка переносит фокус на соседний день, Enter его выбирает', async () => {
		const value = ref<TCalendarValue>(undefined)

		await render(() =>
			h(Calendar, {
				value: value.value,
				'onUpdate:value': (next: TCalendarValue) => {
					value.value = next
				},
			}),
		)

		const today = dayCell('2026-09-26')

		today.focus()
		press(today, 'ArrowLeft')
		await settle()

		expect(document.activeElement).toBe(dayCell('2026-09-25'))
		expect(dayCell('2026-09-25').getAttribute('tabindex')).toBe('0')

		press(dayCell('2026-09-25'), 'Enter')
		await settle()

		expect(value.value).toBe('2026-09-25')
	})

	it('PageDown уводит сетку в следующий месяц, а фокус — на новый день', async () => {
		await render(() => h(Calendar))

		const today = dayCell('2026-09-26')

		today.focus()
		press(today, 'PageDown')
		await settle()

		expect(titles()).toEqual(['October 2026'])
		expect(document.activeElement).toBe(dayCell('2026-10-26'))
	})
})

/**
 * Выбор месяца и года: заголовок сетки — кнопка-триггер поповера, в панели —
 * ListBox и шапка. Модель панели проверяет ядро (`calendar-picker.spec.ts`),
 * здесь — что её выходы доезжают до разметки, а нажатия — до модели.
 */
describe('выбор месяца и года', () => {
	const title = () => find('.s-calendar__title')
	const heading = () => find('.s-calendar__picker-heading')
	const options = () => findAll('.s-calendar__picker-list .s-list-box-item')
	const option = (text: string) => {
		const found = options().find((item) => item.textContent?.trim() === text)

		if (!found) throw new Error(`опции «${text}» нет`)

		return found
	}
	/** Строка опции: на ней набор `aria` элемента и обработчик нажатия. */
	const row = (text: string) => {
		const found = option(text).querySelector('.s-button')

		if (!(found instanceof HTMLElement)) throw new Error(`у опции «${text}» нет строки`)

		return found
	}
	/** Нажатие по строке опции — тем же путём, что клик пользователя. */
	const pick = async (text: string) => {
		row(text).click()
		await settle()
	}
	const openPicker = async () => {
		title().click()
		await settle()
	}
	const panel = () => find('.s-calendar__picker')

	it('заголовок — кнопка, триггер панели; текст и живая область — внутри', async () => {
		await render(() => h(Calendar))

		expect(title().tagName).toBe('BUTTON')
		expect(title().getAttribute('aria-haspopup')).toBe('dialog')
		expect(title().getAttribute('aria-expanded')).toBe('false')
		expect(title().contains(find('.s-calendar__title-text'))).toBe(true)
		// Содержимое панели не смонтировано до первого открытия
		expect(document.querySelector('.s-calendar__picker')).toBeNull()
	})

	it('нажатие на заголовок открывает панель: 12 месяцев, выбран месяц сетки, в шапке год', async () => {
		await render(() => h(Calendar))
		await openPicker()

		const dialog = find('.s-popover__panel')

		expect(title().getAttribute('aria-expanded')).toBe('true')
		expect(title().getAttribute('aria-controls')).toBe(dialog.id)
		expect(heading().textContent?.trim()).toBe('2026')
		expect(dialog.getAttribute('aria-labelledby')).toBe(heading().id)
		expect(find('.s-calendar__picker-list').getAttribute('aria-labelledby')).toBe(heading().id)
		expect(heading().id).not.toBe('')
		expect(options()).toHaveLength(12)
		expect(row('Sep').getAttribute('aria-selected')).toBe('true')
		expect(row('Mar').getAttribute('aria-selected')).toBe('false')
	})

	it('список в DOM раньше шапки: фокус при открытии встаёт на список', async () => {
		await render(() => h(Calendar))
		await openPicker()

		const children = [...panel().children].map(
			(node) => node.classList[node.classList.length - 1],
		)

		expect(children).toEqual(['s-calendar__picker-list', 's-calendar__picker-header'])
	})

	it('месяц → панель закрыта, сетка на нём — v-model:months', async () => {
		const months = ref<string[] | undefined>(undefined)

		await render(() =>
			h(Calendar, {
				months: months.value,
				'onUpdate:months': (value: string[] | undefined) => {
					months.value = value
				},
			}),
		)
		await openPicker()
		await pick('Mar')

		expect(months.value).toEqual(['2026-03-01'])
		expect(titles()).toEqual(['March 2026'])
		expect(title().getAttribute('aria-expanded')).toBe('false')
	})

	it('год в шапке → годы страницы; выбор года → месяцы этого года; месяц → сетка', async () => {
		await render(() => h(Calendar))
		await openPicker()

		heading().click()
		await settle()

		expect(heading().textContent?.trim()).toBe(
			new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).formatRange(
				Date.UTC(2017, 0, 1),
				Date.UTC(2028, 0, 1),
			),
		)
		expect(options().map((item) => item.textContent?.trim())).toEqual([
			'2017',
			'2018',
			'2019',
			'2020',
			'2021',
			'2022',
			'2023',
			'2024',
			'2025',
			'2026',
			'2027',
			'2028',
		])
		expect(row('2026').getAttribute('aria-selected')).toBe('true')

		await pick('2028')

		expect(heading().textContent?.trim()).toBe('2028')
		expect(options()).toHaveLength(12)
		expect(title().getAttribute('aria-expanded')).toBe('true')

		await pick('Feb')

		expect(titles()).toEqual(['February 2028'])
		expect(title().getAttribute('aria-expanded')).toBe('false')
	})

	it('стрелки шапки: имена по уровню, листание года и страницы', async () => {
		await render(() => h(Calendar, { prevYearLabel: 'Предыдущий год' }))
		await openPicker()

		const prev = find('.s-calendar__picker-prev')
		const next = find('.s-calendar__picker-next')

		expect(prev.getAttribute('aria-label')).toBe('Предыдущий год')
		expect(next.getAttribute('aria-label')).toBe('Next year')

		next.click()
		await settle()

		expect(heading().textContent?.trim()).toBe('2027')

		heading().click()
		await settle()

		expect(prev.getAttribute('aria-label')).toBe('Previous 12 years')

		next.click()
		await settle()

		expect(options()[0].textContent?.trim()).toBe('2029')
	})

	it('у границы стрелка гаснет, опции вне min/max выключены', async () => {
		await render(() => h(Calendar, { max: '2026-10-20' }))
		await openPicker()

		expect(find('.s-calendar__picker-next').hasAttribute('disabled')).toBe(true)
		expect(find('.s-calendar__picker-prev').hasAttribute('disabled')).toBe(false)
		expect(option('Nov').dataset.disabled).toBe('true')
		expect(option('Oct').dataset.disabled).toBe('false')
	})

	it('выключенный календарь выключает заголовок', async () => {
		await render(() => h(Calendar, { disabled: true }))

		expect(title().hasAttribute('disabled')).toBe(true)
	})
})
