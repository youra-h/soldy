/**
 * DatePicker во Vue — проводка на настоящей разметке.
 *
 * Модель — общее полям и календарю, одно значение на две стороны, открытость
 * — проверяет ядро, фокус панели и то, что её открывает, — тест плагинов,
 * раскладку и фокус в браузере — `playground/vue/browser/date-picker.spec.ts`.
 * Здесь важно, что экземпляры ядра доезжают до компонентов (`:ctrl`,
 * `:engine`), наборы — на свои узлы, а выбор дня и набор в поле на настоящей
 * разметке возвращаются `v-model`.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { DatePicker } from '@soldy-ui/vue'
import { TDatePicker } from '@soldy-ui/core'
import type { ICalendarItem, TDatePickerValue } from '@soldy-ui/core'

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

/** Перерисовка и кадр. */
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

/** Ячейка дня по его имени — полной дате, как её прочтёт скринридер. */
function dayCell(date: string): HTMLElement {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)

	return find(`.s-calendar-item[aria-label="${label}"]`)
}

const root = () => find('.s-date-picker')
const trigger = () => find('.s-date-picker__trigger')
const panel = () => find('.s-date-picker__panel')
const isOpen = () => panel().style.display !== 'none'

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	from.dispatchEvent(event)

	return event
}

/** Набрать строку с узла под фокусом документа. */
async function type(keys: string): Promise<void> {
	for (const key of keys) {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, key)
		await nextTick()
	}
}

describe('одна дата', () => {
	it('поле с кнопкой календаря в слоте, панель — диалог в body', async () => {
		await render(() => h(DatePicker, { id: 'when', aria_label: 'Дата заезда' }))

		const field = find('.s-date-picker__field')

		expect(root().classList.contains('s-date-picker--single')).toBe(true)
		expect(root().id).toBe('when')
		expect(root().hasAttribute('role')).toBe(false)
		// Группа частей — само поле: имя DatePicker уходит ему
		expect(field.getAttribute('role')).toBe('group')
		expect(field.getAttribute('aria-label')).toBe('Дата заезда')
		expect(field.querySelector('.s-date-input__trailing .s-date-picker__trigger')).toBe(
			trigger(),
		)
		expect(panel().parentElement).toBe(document.body)
		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('aria-label')).toBe('Choose date')
		expect(isOpen()).toBe(false)
	})

	it('кнопка — связка с панелью по id и вид «нажат», пока панель открыта', async () => {
		await render(() => h(DatePicker))

		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-label')).toBe('Choose date')
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().id).not.toBe('')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset.selected).toBe('false')

		trigger().click()
		await settle()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset.selected).toBe('true')
		expect(root().dataset.open).toBe('true')
	})

	it('выбор дня — v-model:value, дата в поле, панель закрывается', async () => {
		const value = ref<TDatePickerValue>(undefined)
		const open = ref(false)

		await render(() =>
			h(DatePicker, {
				value: value.value,
				'onUpdate:value': (next: TDatePickerValue) => {
					value.value = next
				},
				open: open.value,
				'onUpdate:open': (next: boolean) => {
					open.value = next
				},
			}),
		)

		trigger().click()
		await settle()
		expect(open.value).toBe(true)

		dayCell('2026-09-10').click()
		await settle()

		expect(value.value).toBe('2026-09-10')
		expect(open.value).toBe(false)
		expect(isOpen()).toBe(false)
		expect(find('.s-date-picker__field input[type="hidden"]').getAttribute('value')).toBe(
			'2026-09-10',
		)
	})

	it('набор в поле — v-model:value и выбранный день в календаре', async () => {
		const value = ref<TDatePickerValue>(undefined)

		await render(() =>
			h(DatePicker, {
				value: value.value,
				'onUpdate:value': (next: TDatePickerValue) => {
					value.value = next
				},
			}),
		)

		// en-US: месяц, день, год
		find('.s-date-input__segment[data-type="month"]').focus()
		await type('09122026')
		await settle()

		expect(value.value).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset.selected).toBe('true')
	})

	it('выключенный — кнопка выключена, панель не открывается', async () => {
		await render(() => h(DatePicker, { disabled: true }))

		expect(trigger().hasAttribute('disabled')).toBe(true)
		expect(find('.s-date-picker__field').dataset.disabled).toBe('true')
	})
})

describe('диапазон', () => {
	it('корень — группа с именем, поля концов названы, тире немое', async () => {
		await render(() => h(DatePicker, { mode: 'range', aria_label: 'Поездка' }))

		const start = find('.s-date-picker__start')
		const end = find('.s-date-picker__end')

		expect(root().classList.contains('s-date-picker--range')).toBe(true)
		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Поездка')
		expect(start.getAttribute('aria-label')).toBe('Start date')
		expect(end.getAttribute('aria-label')).toBe('End date')
		expect(find('.s-date-picker__dash').getAttribute('aria-hidden')).toBe('true')
		// Кнопка — после поля конца, не в его слоте
		expect(end.nextElementSibling).toBe(trigger())
		expect(findAll('.s-date-picker__field')).toHaveLength(0)
	})

	it('два дня в календаре — пара в v-model и в поля, панель — до второго дня', async () => {
		const value = ref<TDatePickerValue>(undefined)

		await render(() =>
			h(DatePicker, {
				mode: 'range',
				value: value.value,
				'onUpdate:value': (next: TDatePickerValue) => {
					value.value = next
				},
			}),
		)

		trigger().click()
		await settle()

		dayCell('2026-09-14').click()
		await settle()

		expect(isOpen()).toBe(true)
		expect(value.value).toBeUndefined()

		dayCell('2026-09-10').click()
		await settle()

		expect(value.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(isOpen()).toBe(false)

		const hidden = findAll('.s-date-picker input[type="hidden"]').map((input) =>
			input.getAttribute('value'),
		)

		expect(hidden).toEqual(['2026-09-10', '2026-09-14'])
	})

	it('смена режима перерисовывает поля нового режима', async () => {
		const mode = ref<'single' | 'range'>('single')

		await render(() => h(DatePicker, { mode: mode.value, value: '2026-09-10' }))

		mode.value = 'range'
		await settle()

		expect(findAll('.s-date-picker__field')).toHaveLength(0)
		expect(find('.s-date-picker__start input[type="hidden"]').getAttribute('value')).toBe(
			'2026-09-10',
		)
	})
})

describe('экземпляры ядра', () => {
	it('внешний ctrl: поле, календарь и движок — его', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })

		await render(() => h(DatePicker, { ctrl }))

		expect(ctrl.engine.options.get('owner')).toBe(ctrl.calendar)
		expect(dayCell('2026-09-10').dataset.selected).toBe('true')

		ctrl.engine.extensions.selection.chooseDate('2026-09-20')
		await settle()

		expect(ctrl.value).toBe('2026-09-20')
		expect(find('.s-date-picker__field input[type="hidden"]').getAttribute('value')).toBe(
			'2026-09-20',
		)
	})
})

describe('слоты', () => {
	it('trigger-icon подменяет значок кнопки', async () => {
		await render(() =>
			h(DatePicker, null, {
				'trigger-icon': () => h('span', { class: 's-test-icon' }, '📅'),
			}),
		)

		expect(trigger().querySelector('.s-test-icon')).not.toBeNull()
	})

	it('item уходит в дни календаря со scope { item }', async () => {
		await render(() =>
			h(DatePicker, null, {
				item: ({ item }: { item: ICalendarItem }) =>
					h('span', { class: 's-test-day' }, `«${item.text}»`),
			}),
		)

		expect(dayCell('2026-09-10').querySelector('.s-test-day')?.textContent).toBe('«10»')
	})

	it('без слота item день рисует свой номер', async () => {
		await render(() => h(DatePicker))

		expect(dayCell('2026-09-10').textContent?.trim()).toBe('10')
	})
})
