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
import { DatePicker, LocaleProvider } from '@soldy-ui/vue'
import { TDatePicker } from '@soldy-ui/core'
import type { ICalendarItem, TDatePickerValue } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'

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

/**
 * Выбор с подтверждением: модель — черновик в календаре, «OK» и сброс при
 * закрытии — проверяет ядро. Здесь — подвал на настоящей разметке: он есть
 * только при `confirmable`, текст кнопок — строки локали поддерева, «OK»
 * гаснет посреди диапазона, а нажатия доходят до `v-model`.
 */
describe('выбор с подтверждением', () => {
	const footer = () => document.querySelector('.s-date-picker__panel .s-calendar__footer')
	const cancel = () => find('.s-date-picker__cancel')
	const confirm = () => find('.s-date-picker__confirm')

	/** DatePicker с `v-model:value` и `v-model:open` — значения в ссылках. */
	async function bound(initial: TDatePickerValue, props: Record<string, unknown> = {}) {
		const value = ref<TDatePickerValue>(initial)
		const open = ref(false)

		await render(() =>
			h(DatePicker, {
				confirmable: true,
				...props,
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

		return { value, open }
	}

	it('без confirmable подвала нет; с ним — «Отмена», потом «OK», в подвале календаря', async () => {
		const ctrl = new TDatePicker()

		await render(() => h(DatePicker, { ctrl }))

		expect(footer()).toBeNull()

		ctrl.confirmable = true
		await settle()

		const buttons = [...(footer()?.children ?? [])]

		expect(buttons).toEqual([cancel(), confirm()])
		expect(cancel().textContent?.trim()).toBe('Cancel')
		expect(confirm().textContent?.trim()).toBe('OK')
		expect(confirm().hasAttribute('disabled')).toBe(false)

		ctrl.confirmable = false
		await settle()

		expect(footer()).toBeNull()
	})

	it('текст кнопок — от локали поддерева', async () => {
		await render(() =>
			h(LocaleProvider, { locale: ruRU }, () => h(DatePicker, { confirmable: true })),
		)

		expect(cancel().textContent?.trim()).toBe(ruRU.translations.datePicker.cancel)
		expect(confirm().textContent?.trim()).toBe(ruRU.translations.datePicker.confirm)
	})

	it('выбор дня — черновик: v-model прежний, панель открыта; «OK» — значение и закрытие', async () => {
		const { value, open } = await bound('2026-09-10')

		dayCell('2026-09-12').click()
		await settle()

		expect(value.value).toBe('2026-09-10')
		expect(open.value).toBe(true)
		expect(dayCell('2026-09-12').dataset.selected).toBe('true')
		expect(find('.s-date-picker__field input[type="hidden"]').getAttribute('value')).toBe(
			'2026-09-10',
		)

		confirm().click()
		await settle()

		expect(value.value).toBe('2026-09-12')
		expect(open.value).toBe(false)
		expect(isOpen()).toBe(false)
		expect(find('.s-date-picker__field input[type="hidden"]').getAttribute('value')).toBe(
			'2026-09-12',
		)
	})

	it('«Отмена» — панель закрыта, черновик сброшен, значение прежнее', async () => {
		const { value, open } = await bound('2026-09-10')

		dayCell('2026-09-12').click()
		await settle()

		cancel().click()
		await settle()

		expect(open.value).toBe(false)
		expect(value.value).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset.selected).toBe('true')
		expect(dayCell('2026-09-12').dataset.selected).toBe('false')
	})

	it('диапазон: «OK» гаснет на первом дне и загорается на втором', async () => {
		const { value } = await bound(undefined, { mode: 'range' })

		dayCell('2026-09-14').click()
		await settle()

		expect(confirm().hasAttribute('disabled')).toBe(true)

		dayCell('2026-09-10').click()
		await settle()

		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(value.value).toBeUndefined()

		confirm().click()
		await settle()

		expect(value.value).toEqual(['2026-09-10', '2026-09-14'])
	})
})

/**
 * Кнопка очистки — DatePicker'а: он сам поле (база `TField`), и кнопка у него
 * одна на значение. У одной даты она стоит в слоте `clear` поля — первой у его
 * конца, перед кнопкой календаря, — у диапазона одна на период, после поля
 * конца. Своей кнопки поля не рисуют. Что очистка делает с моделью — у обоих
 * концов, и у набранного не до конца, — проверяет ядро
 * (`core/__tests__/date-picker.spec.ts`), форму кнопки — браузерный прогон.
 */
describe('кнопка очистки', () => {
	const clearButtons = () => findAll('.s-date-picker__clear')
	const clearButton = () => find('.s-date-picker__clear')

	/** Своя кнопка в слоте `clear`: зовёт команду из scope голой функцией. */
	const probe = ({ clear }: { clear: () => void }) =>
		h('button', { class: 'probe-clear', onClick: () => clear() })

	it('без clearable кнопки нет — ни у одной даты, ни у диапазона', async () => {
		const mode = ref<'single' | 'range'>('single')

		await render(() => h(DatePicker, { mode: mode.value, value: '2026-09-10' }))

		expect(clearButtons()).toHaveLength(0)

		mode.value = 'range'
		await settle()

		expect(clearButtons()).toHaveLength(0)
		expect(findAll('.s-date-input__clear')).toHaveLength(0)
	})

	it('одна дата: первой в слоте у конца поля, перед кнопкой календаря; у поля своей нет', async () => {
		await render(() => h(DatePicker, { clearable: true, name: 'Заезд' }))

		const slot = find('.s-date-picker__field .s-date-input__trailing')

		expect([...slot.children]).toEqual([clearButton(), trigger()])
		expect(clearButton().getAttribute('aria-label')).toBe('Clear Заезд')
		expect(root().classList.contains('s-date-picker--clearable')).toBe(true)
		expect(find('.s-date-picker__field').classList.contains('s-date-input--clearable')).toBe(
			false,
		)
		expect(findAll('.s-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: одна на период — после поля конца, перед кнопкой календаря', async () => {
		await render(() => h(DatePicker, { mode: 'range', clearable: true }))

		expect(clearButtons()).toHaveLength(1)
		expect(find('.s-date-picker__end').nextElementSibling).toBe(clearButton())
		expect(clearButton().nextElementSibling).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear')
		// У полей концов своих кнопок нет: `clearable` им не уходит
		expect(findAll('.s-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: клик очищает оба конца — v-model видит пустое, клик не всплывает', async () => {
		const value = ref<TDatePickerValue>(['2026-09-10', '2026-09-14'])
		const parentClick = vi.fn()

		await render(() =>
			h('div', { onClick: parentClick }, [
				h(DatePicker, {
					mode: 'range',
					clearable: true,
					value: value.value,
					'onUpdate:value': (next: TDatePickerValue) => {
						value.value = next
					},
				}),
			]),
		)

		clearButton().click()
		await settle()

		expect(value.value).toBeUndefined()
		expect(
			findAll('.s-date-picker input[type="hidden"]').map((input) =>
				input instanceof HTMLInputElement ? input.value : null,
			),
		).toEqual(['', ''])
		expect(parentClick).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду DatePicker: clear — у него, в обоих режимах', async () => {
		const ctrl = new TDatePicker({ clearable: true, value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render(() => h(DatePicker, { ctrl }))

		clearButton().click()
		await settle()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)

		ctrl.mode = 'range'
		ctrl.value = ['2026-09-10', '2026-09-14']
		await settle()

		clearButton().click()
		await settle()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(2)
	})

	it('размер — DatePicker, выключена — вместе с ним, readonly её не гасит', async () => {
		const disabled = ref(false)

		await render(() =>
			h(DatePicker, {
				clearable: true,
				size: 'lg',
				readonly: true,
				disabled: disabled.value,
			}),
		)

		expect(clearButton().classList.contains('s-button--size-lg')).toBe(true)
		expect(clearButton().hasAttribute('disabled')).toBe(false)

		disabled.value = true
		await settle()

		expect(clearButton().hasAttribute('disabled')).toBe(true)
	})

	it('своя кнопка — слот clear с командой DatePicker в scope, у одной даты — в слоте поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render(() => h(DatePicker, { ctrl }, { clear: probe }))

		expect(find('.s-date-picker__field .s-date-input__trailing > .probe-clear')).toBeTruthy()
		expect(clearButtons()).toHaveLength(0)

		find('.probe-clear').click()
		await settle()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)
	})

	it('своя кнопка у диапазона — после поля конца, вместо встроенной', async () => {
		await render(() => h(DatePicker, { mode: 'range', clearable: true }, { clear: probe }))

		expect(find('.s-date-picker__end').nextElementSibling).toBe(find('.probe-clear'))
		expect(clearButtons()).toHaveLength(0)
	})
})

/**
 * Ошибку считает ядро поля; здесь — что она доходит до разметки: смена одного
 * правила недоступности перечитывает части (`aria-invalid`) и набор корня
 * поля (`data-invalid`).
 */
describe('ошибка в поле', () => {
	it('правило недоступности, заданное позже, помечает части и корень поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-15' })

		await render(() => h(DatePicker, { ctrl }))

		const field = find('.s-date-picker__field')
		const parts = () => findAll('.s-date-picker__field .s-date-input__segment')

		expect(field.dataset.invalid).toBe('false')
		expect(parts().some((part) => part.hasAttribute('aria-invalid'))).toBe(false)

		ctrl.unavailable = (date) => date === '2026-09-15'
		await settle()

		expect(field.dataset.invalid).toBe('true')
		expect(parts().every((part) => part.getAttribute('aria-invalid') === 'true')).toBe(true)
	})

	it('конец раньше начала — ошибка у поля конца, у начала её нет', async () => {
		await render(() => h(DatePicker, { mode: 'range', value: ['2026-09-20', '2026-09-10'] }))

		expect(find('.s-date-picker__end').dataset.invalid).toBe('true')
		expect(find('.s-date-picker__start').dataset.invalid).toBe('false')
	})
})

/**
 * Значение в форму отдают поля — скрытым полем DateInput. Что уйдёт при
 * отправке, считает сам браузер (`FormData`): поле без имени он пропускает.
 */
describe('форма', () => {
	function entries(): [string, FormDataEntryValue][] {
		const form = document.querySelector('form')

		if (!(form instanceof HTMLFormElement)) throw new Error('формы нет')

		return [...new FormData(form).entries()]
	}

	it('одна дата — под name', async () => {
		await render(() =>
			h('form', [
				h(DatePicker, {
					name: 'date',
					startName: 'from',
					endName: 'to',
					value: '2026-09-10',
				}),
			]),
		)

		expect(entries()).toEqual([['date', '2026-09-10']])
	})

	it('концы диапазона — под startName и endName', async () => {
		const value = ref<TDatePickerValue>(['2026-09-10', '2026-09-14'])
		const names = ref({ startName: 'from', endName: 'to' })

		await render(() =>
			h('form', [
				h(DatePicker, {
					mode: 'range',
					name: 'date',
					...names.value,
					value: value.value,
				}),
			]),
		)

		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', '2026-09-14'],
		])

		names.value = { startName: 'checkIn', endName: 'checkOut' }
		await settle()

		expect(entries()).toEqual([
			['checkIn', '2026-09-10'],
			['checkOut', '2026-09-14'],
		])
	})

	it('недонабранный период: каждый конец уходит своим значением', async () => {
		const ctrl = new TDatePicker({ mode: 'range', startName: 'from', endName: 'to' })

		await render(() => h('form', [h(DatePicker, { ctrl })]))

		ctrl.start.paste('2026-09-10')
		await settle()

		// Значения у DatePicker ещё нет, а начало в форме — есть
		expect(ctrl.value).toBeUndefined()
		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', ''],
		])
	})

	it('без имён концов диапазон в форму не уходит', async () => {
		await render(() =>
			h('form', [
				h(DatePicker, { mode: 'range', name: 'date', value: ['2026-09-10', '2026-09-14'] }),
			]),
		)

		expect(entries()).toEqual([])
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

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`), раскладку, прокрутку и настоящую
 * мышь — браузер (`playground/vue/browser/anchored-swipe.spec.ts`). Здесь —
 * проводка: полоса и признак «тянут» на телепортированной панели, календарь в
 * своём содержимом, а закрытие жестом доходит до `v-model`.
 */
describe('жест', () => {
	const handle = () => document.querySelector('.s-date-picker__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (type: string, target: Element, y: number) =>
		target.dispatchEvent(
			new PointerEvent(type, {
				bubbles: true,
				cancelable: true,
				clientX: 100,
				clientY: y,
				pointerId: 1,
				pointerType: 'mouse',
				button: 0,
				isPrimary: true,
			}),
		)

	it('без жеста полосы нет; с жестом — первая в панели, немая; календарь — в содержимом', async () => {
		const ctrl = new TDatePicker()

		await render(() => h(DatePicker, { ctrl }))

		expect(handle()).toBeNull()
		expect(panel().dataset.swiping).toBe('false')
		expect(find('.s-date-picker__content').parentElement).toBe(panel())
		expect(find('.s-date-picker__calendar').parentElement).toBe(find('.s-date-picker__content'))

		ctrl.swipe = 'handle'
		await settle()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после flip
	 * плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по полосе
	 * вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от поля — закрыта, v-model видит закрытие, признак «тянут» на панели', async () => {
		const open = ref(false)

		await render(() =>
			h(DatePicker, {
				swipe: 'handle',
				open: open.value,
				'onUpdate:open': (next: boolean) => {
					open.value = next
				},
			}),
		)

		trigger().click()
		await settle()

		expect(open.value).toBe(true)
		expect(panel().dataset.placement).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 320))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 145)
		await nextTick()

		expect(panel().style.getPropertyValue('--s-swipe-offset')).toBe('100px')
		expect(panel().dataset.swiping).toBe('true')

		pointer('pointerup', panel(), 150)
		await settle()

		expect(open.value).toBe(false)
		expect(isOpen()).toBe(false)
		expect(panel().dataset.swiping).toBe('false')
	})
})
