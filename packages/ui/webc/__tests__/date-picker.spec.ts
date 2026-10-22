/**
 * `<div is="so-date-picker">` — поле даты и календарь в панели.
 *
 * Сценарии — те же, что у Vue (`date-picker.spec.ts`), React и Solid, без
 * сервера и `act`. Модель — общее полям и календарю, одно значение на две
 * стороны, открытость — проверяет ядро, фокус панели и то, что её открывает, —
 * тест плагинов, раскладку и фокус в браузере —
 * `playground/vue/browser/date-picker.spec.ts`. Здесь важно, что экземпляры
 * ядра доезжают до деталей (`ctrl`, `engine`), наборы — на свои узлы, а выбор
 * дня и набор в поле на настоящей разметке возвращаются событиями
 * `so:change:value` и `so:change:open`.
 *
 * Угол зрения здесь свой. Корень — элемент потребителя, поля, календарь и
 * панель — детали его разметки: их события не всплывают, а атрибуты разметки
 * остаются на корне. Смена режима переставляет кнопки и вынимает разметку
 * прежнего режима, а поля остаются деталями над теми же экземплярами. Подвал
 * календаря — свет к его построению, поэтому смена `confirmable` строит
 * календарь панели заново. Scope у слотов нет: своя кнопка очистки берёт
 * команду у элемента (`el.ctrl.clear()`), содержимое дня — у элемента дня.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { TDatePicker, type TDatePickerValue } from '@soldy-ui/core'
import { ruRU, type TLocale } from '@soldy-ui/plugins'
import { DatePickerDescriptor } from '@soldy-ui/setup'
import {
	DATE_PICKER_CALENDAR_SLOTS,
	TButtonElement,
	TCalendarElement,
	TCalendarItemElement,
	TDateInputElement,
	TDatePickerElement,
	TFrameElement,
	TIconElement,
	TLocaleProviderElement,
	type TButtonElementProps,
	type TCalendarItemElementProps,
	type TDatePickerElementProps,
} from '@soldy-ui/webc'
import { datePickerTemplate } from '../src/components/date-picker/date-picker.template'
import { bareContext } from './template-context'

/** Рендер коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Перерисовка и кадр. */
async function settle(): Promise<void> {
	await flush()
	await nextFrame()
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

function isDatePicker(node: Element | null): node is TDatePickerElementProps {
	return node instanceof TDatePickerElement
}

function isButton(node: Element | null): node is TButtonElementProps {
	return node instanceof TButtonElement
}

/** DatePicker soldy в разметке. */
function datePickerOf(root: ParentNode): TDatePickerElementProps {
	const node = root.querySelector('[is="so-date-picker"]')

	if (!isDatePicker(node)) throw new Error('<div is="so-date-picker"> нет')

	return node
}

/**
 * Разметка с DatePicker, подключённая к документу, и кадр: корень плагины
 * получают через `requestAnimationFrame`. `prepare` — до вставки: `ctrl`.
 * `locale` — провайдер вокруг разметки.
 */
async function mount(
	html = '<div is="so-date-picker"></div>',
	prepare: (el: TDatePickerElementProps) => void = () => {},
	locale?: TLocale,
): Promise<TDatePickerElementProps> {
	const host = document.createElement('div')

	host.innerHTML = locale ? `<so-locale-provider>${html}</so-locale-provider>` : html

	if (locale) {
		const provider = host.firstElementChild

		if (!(provider instanceof TLocaleProviderElement)) throw new Error('провайдера нет')

		provider.locale = locale
	}

	const el = datePickerOf(host)

	prepare(el)
	document.body.appendChild(host)
	await settle()

	return el
}

/** Значение DatePicker из события — вид проверяется здесь, а не берётся на веру. */
function valueOf(detail: unknown): TDatePickerValue {
	if (typeof detail !== 'object' || detail === null || !('newValue' in detail)) {
		throw new Error('у события нет пары значений')
	}

	const { newValue } = detail

	if (typeof newValue === 'string') return newValue
	if (Array.isArray(newValue) && newValue.length === 2) {
		const [start, end] = newValue

		if (typeof start === 'string' && typeof end === 'string') return [start, end]
	}

	return undefined
}

/** Что DatePicker вернул событиями — как `v-model:value` и `v-model:open` у Vue. */
type TModel = {
	value: TDatePickerValue
	open: boolean
}

/**
 * Значение и открытость, которые возвращает потребитель, — как `v-model` у
 * Vue: на каждую смену он пишет их обратно в свойства элемента.
 */
function model(el: TDatePickerElementProps, initial: TDatePickerValue = undefined): TModel {
	const state: TModel = { value: initial, open: el.open === true }

	el.addEventListener('so:change:value', (event) => {
		if (!(event instanceof CustomEvent)) return

		state.value = valueOf(event.detail)
		el.value = state.value
	})
	el.addEventListener('so:change:open', (event) => {
		if (!(event instanceof CustomEvent) || typeof event.detail !== 'boolean') return

		state.open = event.detail
		el.open = state.open
	})

	return state
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

const node = (selector: string) => find(document, selector, HTMLElement)

function findAll(selector: string): HTMLElement[] {
	return [...document.querySelectorAll(selector)].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	)
}

function isDay(node: Element | null): node is TCalendarItemElementProps {
	return node instanceof TCalendarItemElement
}

/** Ячейка дня по его имени — полной дате, как её прочтёт скринридер. */
function dayCell(date: string): TCalendarItemElementProps {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)
	const day = document.querySelector(`.so-calendar-item[aria-label="${label}"]`)

	if (!isDay(day)) throw new Error(`дня ${date} нет`)

	return day
}

const trigger = () => {
	const button = document.querySelector('.so-date-picker__trigger')

	if (!isButton(button)) throw new Error('кнопки календаря нет')

	return button
}
const panel = () => node('.so-date-picker__panel')
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
		await flush()
	}
}

/**
 * Часть узла — первый класс DatePicker на нём: у элемента soldy класс части
 * шаблон пишет до сборки, и он стоит перед классами компонента.
 */
const partOf = (element: Element) =>
	[...element.classList].find((name) => name.startsWith('so-date-picker__')) ?? element.localName

describe('DatePicker · одна дата', () => {
	it('поле с кнопкой календаря в слоте, панель — диалог в body', async () => {
		const el = await mount('<div is="so-date-picker" id="when" aria_label="Дата заезда"></div>')

		const field = node('.so-date-picker__field')

		expect(el).toBeInstanceOf(HTMLDivElement)
		expect(el.classList.contains('so-date-picker--single')).toBe(true)
		expect(el.id).toBe('when')
		expect(el.hasAttribute('role')).toBe(false)
		// Группа частей — само поле: имя DatePicker уходит ему
		expect(field).toBeInstanceOf(TDateInputElement)
		expect(field.getAttribute('embedded')).toBe('date-picker.field')
		expect(field.getAttribute('role')).toBe('group')
		expect(field.getAttribute('aria-label')).toBe('Дата заезда')
		expect(field.querySelector('.so-date-input__trailing .so-date-picker__trigger')).toBe(
			trigger(),
		)
		expect(panel()).toBeInstanceOf(TFrameElement)
		expect(panel().parentElement).toBe(document.body)
		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('aria-label')).toBe('Choose date')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(isOpen()).toBe(false)
	})

	it('корень — поле и место режима; кнопка календаря — деталь со значком роли calendar', async () => {
		const el = await mount()

		expect([...el.children].map(partOf)).toEqual(['so-date-picker__field'])
		expect(trigger().getAttribute('embedded')).toBe('date-picker.trigger')
		expect(trigger().getAttribute('type')).toBe('button')

		const icon = trigger().querySelector('.so-icon')

		expect(icon).toBeInstanceOf(TIconElement)
		expect(icon?.getAttribute('embedded')).toBe('date-picker.trigger-icon')
		expect(icon?.getAttribute('icon')).toBe('calendar')
	})

	it('кнопка — связка с панелью по id и вид «нажат», пока панель открыта', async () => {
		const el = await mount()

		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-label')).toBe('Choose date')
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().id).not.toBe('')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset['selected']).toBe('false')

		trigger().click()
		await settle()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset['selected']).toBe('true')
		expect(el.dataset['open']).toBe('true')
	})

	it('выбор дня — so:change:value, дата в поле, панель закрывается', async () => {
		const el = await mount()
		const state = model(el)

		trigger().click()
		await settle()
		expect(state.open).toBe(true)

		dayCell('2026-09-10').click()
		await settle()

		expect(state.value).toBe('2026-09-10')
		expect(state.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(
			find(document, '.so-date-picker__field input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-10')
	})

	it('набор в поле — so:change:value и выбранный день в календаре', async () => {
		const el = await mount()
		const state = model(el)

		// en-US: месяц, день, год
		node('.so-date-input__segment[data-type="month"]').focus()
		await type('09122026')
		await settle()

		expect(state.value).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
	})

	it('выключенный — кнопка выключена, панель не открывается', async () => {
		await mount('<div is="so-date-picker" disabled></div>')

		expect(trigger().hasAttribute('disabled')).toBe(true)
		expect(node('.so-date-picker__field').dataset['disabled']).toBe('true')

		trigger().click()
		await settle()

		expect(isOpen()).toBe(false)
	})
})

describe('DatePicker · диапазон', () => {
	it('корень — группа с именем, поля концов названы, тире немое', async () => {
		const el = await mount('<div is="so-date-picker" mode="range" aria_label="Поездка"></div>')

		const start = node('.so-date-picker__start')
		const end = node('.so-date-picker__end')

		expect(el.classList.contains('so-date-picker--range')).toBe(true)
		expect(el.getAttribute('role')).toBe('group')
		expect(el.getAttribute('aria-label')).toBe('Поездка')
		expect(start.getAttribute('embedded')).toBe('date-picker.start')
		expect(end.getAttribute('embedded')).toBe('date-picker.end')
		expect(start.getAttribute('aria-label')).toBe('Start date')
		expect(end.getAttribute('aria-label')).toBe('End date')
		expect(node('.so-date-picker__dash').getAttribute('aria-hidden')).toBe('true')
		// Кнопка — после поля конца, не в его слоте
		expect(end.nextElementSibling).toBe(trigger())
		expect(findAll('.so-date-picker__field')).toHaveLength(0)
		expect([...el.children].map(partOf)).toEqual([
			'so-date-picker__start',
			'so-date-picker__dash',
			'so-date-picker__end',
			'so-date-picker__trigger',
		])
	})

	it('два дня в календаре — пара в значении и в полях, панель — до второго дня', async () => {
		const el = await mount('<div is="so-date-picker" mode="range"></div>')
		const state = model(el)

		trigger().click()
		await settle()

		dayCell('2026-09-14').click()
		await settle()

		expect(isOpen()).toBe(true)
		expect(state.value).toBeUndefined()

		dayCell('2026-09-10').click()
		await settle()

		expect(state.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(isOpen()).toBe(false)
		expect(
			findAll('.so-date-picker input[type="hidden"]').map((input) =>
				input instanceof HTMLInputElement ? input.value : null,
			),
		).toEqual(['2026-09-10', '2026-09-14'])
	})

	it('смена режима перерисовывает поля нового режима', async () => {
		const el = await mount('<div is="so-date-picker" value="2026-09-10"></div>')

		el.mode = 'range'
		await settle()

		expect(findAll('.so-date-picker__field')).toHaveLength(0)
		expect(
			find(document, '.so-date-picker__start input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-10')
	})

	/**
	 * Поля — экземпляры DatePicker на всю жизнь: вернувшись, разметка режима
	 * встаёт над теми же экземплярами, а кнопка календаря — снова в слот поля.
	 */
	it('режим вернулся — поле над тем же экземпляром, кнопка снова в его слоте', async () => {
		const el = await mount('<div is="so-date-picker" value="2026-09-10"></div>')
		const field = node('.so-date-picker__field')

		el.mode = 'range'
		await settle()
		el.mode = 'single'
		await settle()

		expect(node('.so-date-picker__field')).toBe(field)
		expect(findAll('.so-date-picker__start')).toHaveLength(0)
		expect(findAll('.so-date-picker__dash')).toHaveLength(0)
		expect(field.querySelector('.so-date-input__trailing .so-date-picker__trigger')).toBe(
			trigger(),
		)
		expect(find(field, 'input[type="hidden"]', HTMLInputElement).value).toBe('2026-09-10')
	})
})

/**
 * Выбор с подтверждением: модель — черновик в календаре, «OK» и сброс при
 * закрытии — проверяет ядро. Здесь — подвал на настоящей разметке: он есть
 * только при `confirmable`, текст кнопок — строки локали поддерева, «OK»
 * гаснет посреди диапазона, а нажатия доходят до событий.
 */
describe('DatePicker · выбор с подтверждением', () => {
	const footer = () => document.querySelector('.so-date-picker__panel .so-calendar__footer')
	const cancel = () => node('.so-date-picker__cancel')
	const confirm = () => node('.so-date-picker__confirm')

	/** DatePicker с подтверждением, значение и открытость — событиями; панель открыта. */
	async function bound(html: string): Promise<TModel> {
		const el = await mount(html)
		const state = model(el, el.ctrl?.value)

		trigger().click()
		await settle()

		return state
	}

	it('без confirmable подвала нет; с ним — «Отмена», потом «OK», в подвале календаря', async () => {
		const ctrl = new TDatePicker()

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

		expect(footer()).toBeNull()

		ctrl.confirmable = true
		await settle()

		expect([...(footer()?.children ?? [])]).toEqual([cancel(), confirm()])
		expect(cancel().getAttribute('embedded')).toBe('date-picker.cancel')
		expect(confirm().getAttribute('embedded')).toBe('date-picker.confirm')
		expect(cancel().textContent?.trim()).toBe('Cancel')
		expect(confirm().textContent?.trim()).toBe('OK')
		expect(confirm().hasAttribute('disabled')).toBe(false)

		ctrl.confirmable = false
		await settle()

		expect(footer()).toBeNull()
		// Календарь в панели один — построен заново над теми же экземплярами
		expect(findAll('.so-date-picker__calendar')).toHaveLength(1)
		expect(dayCell('2026-09-10')).toBeInstanceOf(TCalendarItemElement)
	})

	it('текст кнопок — от локали поддерева', async () => {
		await mount('<div is="so-date-picker" confirmable></div>', undefined, ruRU)

		expect(cancel().textContent?.trim()).toBe(ruRU.translations.datePicker.cancel)
		expect(confirm().textContent?.trim()).toBe(ruRU.translations.datePicker.confirm)
	})

	it('выбор дня — черновик: значение прежнее, панель открыта; «OK» — значение и закрытие', async () => {
		const state = await bound('<div is="so-date-picker" confirmable value="2026-09-10"></div>')

		dayCell('2026-09-12').click()
		await settle()

		expect(state.value).toBe('2026-09-10')
		expect(state.open).toBe(true)
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
		expect(
			find(document, '.so-date-picker__field input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-10')

		confirm().click()
		await settle()

		expect(state.value).toBe('2026-09-12')
		expect(state.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(
			find(document, '.so-date-picker__field input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-12')
	})

	it('«Отмена» — панель закрыта, черновик сброшен, значение прежнее', async () => {
		const state = await bound('<div is="so-date-picker" confirmable value="2026-09-10"></div>')

		dayCell('2026-09-12').click()
		await settle()

		cancel().click()
		await settle()

		expect(state.open).toBe(false)
		expect(state.value).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('false')
	})

	it('диапазон: «OK» гаснет на первом дне и загорается на втором', async () => {
		const state = await bound('<div is="so-date-picker" confirmable mode="range"></div>')

		dayCell('2026-09-14').click()
		await settle()

		expect(confirm().hasAttribute('disabled')).toBe(true)

		dayCell('2026-09-10').click()
		await settle()

		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(state.value).toBeUndefined()

		confirm().click()
		await settle()

		expect(state.value).toEqual(['2026-09-10', '2026-09-14'])
	})
})

/**
 * Кнопка очистки — DatePicker'а: он сам поле (база `TClearable`), и кнопка у
 * него одна на значение. У одной даты она стоит в слоте `clear` поля — первой у
 * его конца, перед кнопкой календаря, — у диапазона одна на период, после
 * поля конца. Своей кнопки поля не рисуют.
 */
describe('DatePicker · кнопка очистки', () => {
	const clearButtons = () => findAll('.so-date-picker__clear')
	const clearButton = () => {
		const button = document.querySelector('.so-date-picker__clear')

		if (!isButton(button)) throw new Error('кнопки очистки нет')

		return button
	}

	it('без clearable кнопки нет — ни у одной даты, ни у диапазона', async () => {
		const el = await mount('<div is="so-date-picker" value="2026-09-10"></div>')

		expect(clearButtons()).toHaveLength(0)

		el.mode = 'range'
		await settle()

		expect(clearButtons()).toHaveLength(0)
		expect(findAll('.so-date-input__clear')).toHaveLength(0)
	})

	it('одна дата: первой в слоте у конца поля, перед кнопкой календаря; у поля своей нет', async () => {
		const el = await mount('<div is="so-date-picker" clearable name="Заезд"></div>')

		const slot = node('.so-date-picker__field .so-date-input__trailing')

		expect([...slot.children]).toEqual([clearButton(), trigger()])
		expect(clearButton().getAttribute('embedded')).toBe('date-picker.clear')
		expect(clearButton().getAttribute('aria-label')).toBe('Clear Заезд')
		expect(clearButton().querySelector('.so-icon')?.getAttribute('embedded')).toBe(
			'date-picker.clear-icon',
		)
		expect(el.classList.contains('so-date-picker--clearable')).toBe(true)
		expect(node('.so-date-picker__field').classList.contains('so-date-input--clearable')).toBe(
			false,
		)
		expect(findAll('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: одна на период — после поля конца, перед кнопкой календаря', async () => {
		await mount('<div is="so-date-picker" mode="range" clearable></div>')

		expect(clearButtons()).toHaveLength(1)
		expect(node('.so-date-picker__end').nextElementSibling).toBe(clearButton())
		expect(clearButton().nextElementSibling).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear')
		// У полей концов своих кнопок нет: `clearable` им не уходит
		expect(findAll('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: клик очищает оба конца — значение пустое, клик не всплывает', async () => {
		const ctrl = new TDatePicker({ mode: 'range', clearable: true })
		const parentClick = vi.fn()

		ctrl.value = ['2026-09-10', '2026-09-14']

		const el = await mount(undefined, (node) => {
			node.ctrl = ctrl
		})

		el.parentElement?.addEventListener('click', parentClick)

		clearButton().click()
		await settle()

		expect(ctrl.value).toBeUndefined()
		expect(
			findAll('.so-date-picker input[type="hidden"]').map((input) =>
				input instanceof HTMLInputElement ? input.value : null,
			),
		).toEqual(['', ''])
		expect(parentClick).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду DatePicker: clear — у него, в обоих режимах', async () => {
		const ctrl = new TDatePicker({ clearable: true, value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

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
		const el = await mount('<div is="so-date-picker" clearable size="lg" readonly></div>')

		expect(clearButton().classList.contains('so-button--size-lg')).toBe(true)
		expect(clearButton().hasAttribute('disabled')).toBe(false)

		el.disabled = true
		await settle()

		expect(clearButton().hasAttribute('disabled')).toBe(true)
	})

	it('своя кнопка — слот clear в слоте поля; команду берёт у элемента', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		const el = await mount(
			'<div is="so-date-picker"><button slot="clear" type="button" class="probe-clear"></button></div>',
			(node) => {
				node.ctrl = ctrl
			},
		)

		expect(
			document.querySelector(
				'.so-date-picker__field .so-date-input__trailing > .probe-clear',
			),
		).not.toBeNull()
		expect(clearButtons()).toHaveLength(0)

		const own = node('.probe-clear')

		own.addEventListener('click', () => el.ctrl?.clear())
		own.click()
		await settle()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)
	})

	it('своя кнопка у диапазона — после поля конца, вместо встроенной; режим вернулся — снова в поле', async () => {
		const el = await mount(
			'<div is="so-date-picker" mode="range" clearable><button slot="clear" type="button" class="probe-clear"></button></div>',
		)

		expect(node('.so-date-picker__end').nextElementSibling).toBe(node('.probe-clear'))
		expect(node('.probe-clear').nextElementSibling).toBe(trigger())
		expect(clearButtons()).toHaveLength(0)

		el.mode = 'single'
		await settle()

		const slot = node('.so-date-picker__field .so-date-input__trailing')

		expect([...slot.children]).toEqual([node('.probe-clear'), trigger()])
	})
})

/**
 * Ошибку считает ядро поля; здесь — что она доходит до разметки: смена одного
 * правила недоступности перечитывает части (`aria-invalid`) и набор корня
 * поля (`data-invalid`).
 */
describe('DatePicker · ошибка в поле', () => {
	it('правило недоступности, заданное позже, помечает части и корень поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-15' })

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

		const field = node('.so-date-picker__field')
		const parts = () => findAll('.so-date-picker__field .so-date-input__segment')

		expect(field.dataset['invalid']).toBeUndefined()
		expect(parts().some((part) => part.hasAttribute('aria-invalid'))).toBe(false)

		ctrl.unavailable = (date) => date === '2026-09-15'
		await settle()

		expect(field.dataset['invalid']).toBe('true')
		expect(parts().every((part) => part.getAttribute('aria-invalid') === 'true')).toBe(true)
	})

	it('конец раньше начала — ошибка у поля конца, у начала её нет', async () => {
		const ctrl = new TDatePicker({ mode: 'range' })

		ctrl.value = ['2026-09-20', '2026-09-10']

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

		expect(node('.so-date-picker__end').dataset['invalid']).toBe('true')
		expect(node('.so-date-picker__start').dataset['invalid']).toBeUndefined()
	})
})

/**
 * Проверка набора — проп DatePicker'а: полям его отдаёт ядро, а разметка на
 * детали DateInput его не пишет. Здесь — весь путь: проп из разметки — ядру,
 * ядро — полю, и собранная деталь, которой проп не задан, не перетирает его
 * своим умолчанием. Та же пара, что «00» на дне у DateInput, и на том же
 * русском формате: день, месяц, год.
 */
describe('DatePicker · проверка набора', () => {
	/** Часть поля одной даты по типу. */
	const segment = (type: string) =>
		node(`.so-date-picker__field .so-date-input__segment[data-type="${type}"]`)

	it('«00» на дне без validate — день 00, фокус уходит на месяц', async () => {
		await mount(undefined, undefined, ruRU)

		segment('day').focus()
		await type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('«00» на дне с validate — фокус стоит, часть ждёт цифры', async () => {
		await mount('<div is="so-date-picker" validate></div>', undefined, ruRU)

		segment('day').focus()
		await type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('day'))
	})
})

/**
 * Значение в форму отдают поля — скрытым полем DateInput. Что уйдёт при
 * отправке, считает сам браузер (`FormData`): поле без имени он пропускает.
 */
describe('DatePicker · форма', () => {
	function entries(): [string, FormDataEntryValue][] {
		return [...new FormData(find(document, 'form', HTMLFormElement)).entries()]
	}

	/** Форма с DatePicker над готовым инстансом. */
	const inForm = (ctrl: TDatePicker) =>
		mount('<form><div is="so-date-picker"></div></form>', (el) => {
			el.ctrl = ctrl
		})

	it('одна дата — под name', async () => {
		await mount(
			'<form><div is="so-date-picker" name="date" start-name="from" end-name="to" value="2026-09-10"></div></form>',
		)

		expect(entries()).toEqual([['date', '2026-09-10']])
	})

	it('концы диапазона — под startName и endName', async () => {
		const ctrl = new TDatePicker({
			mode: 'range',
			name: 'date',
			startName: 'from',
			endName: 'to',
		})

		ctrl.value = ['2026-09-10', '2026-09-14']

		await inForm(ctrl)

		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', '2026-09-14'],
		])

		ctrl.startName = 'checkIn'
		ctrl.endName = 'checkOut'
		await settle()

		expect(entries()).toEqual([
			['checkIn', '2026-09-10'],
			['checkOut', '2026-09-14'],
		])
	})

	it('недонабранный период: каждый конец уходит своим значением', async () => {
		const ctrl = new TDatePicker({ mode: 'range', startName: 'from', endName: 'to' })

		await inForm(ctrl)

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
		const ctrl = new TDatePicker({ mode: 'range', name: 'date' })

		ctrl.value = ['2026-09-10', '2026-09-14']

		await inForm(ctrl)

		expect(entries()).toEqual([])
	})
})

describe('DatePicker · экземпляры ядра', () => {
	it('внешний ctrl: поля, календарь и движок — его', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

		const calendar = node('.so-date-picker__calendar')

		expect(calendar).toBeInstanceOf(TCalendarElement)
		expect(calendar.getAttribute('embedded')).toBe('date-picker.calendar')
		expect(ctrl.engine.options.get('owner')).toBe(ctrl.calendar)
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')

		ctrl.engine.extensions.selection.chooseDate('2026-09-20')
		await settle()

		expect(ctrl.value).toBe('2026-09-20')
		expect(
			find(document, '.so-date-picker__field input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-20')
	})

	/**
	 * Детали — разметка DatePicker: их события до него не всплывают. Выбор он
	 * сообщает своим `so:change:value`.
	 */
	it('события деталей не всплывают, значение — so:change:value DatePicker', async () => {
		const el = await mount()
		const heard: string[] = []

		el.addEventListener('so:change:value', (event) => {
			if (event.target === el) heard.push('date-picker')
		})
		el.addEventListener('so:element:ready', () => heard.push('detail'))

		trigger().click()
		await settle()
		dayCell('2026-09-10').click()
		await settle()

		expect(heard).toEqual(['date-picker'])
	})
})

describe('DatePicker · слоты', () => {
	it('trigger-icon подменяет значок кнопки', async () => {
		await mount(
			'<div is="so-date-picker"><span slot="trigger-icon" class="so-test-icon">📅</span></div>',
		)

		expect(trigger().querySelector('.so-test-icon')).not.toBeNull()
		expect(trigger().querySelector('.so-icon')).toBeNull()
	})

	/**
	 * Образец `item` DatePicker'а уходит календарю образцом под тем же именем, а
	 * календарь копирует его в каждый день; данные копия берёт у элемента дня.
	 */
	it('item — образец: копия в каждом дне календаря панели', async () => {
		await mount(`<div is="so-date-picker">
			<template slot="item"><span class="so-test-day"></span></template>
		</div>`)

		const day = dayCell('2026-09-10')

		expect(day.querySelector('.so-calendar-item__day > .so-test-day')).not.toBeNull()
		expect(day.ctrl?.text).toBe('10')
		expect(DATE_PICKER_CALENDAR_SLOTS).toEqual({ item: 'item' })
	})

	it('без слота item день рисует свой номер', async () => {
		await mount()

		expect(dayCell('2026-09-10').textContent?.trim()).toBe('10')
	})

	it('шаблон объявляет ровно те слоты, что и дескриптор', () => {
		const root = document.createElement('div')
		const targets = datePickerTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets)).toEqual(DatePickerDescriptor().slots.map((slot) => slot.name))
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`), раскладку, прокрутку и настоящую
 * мышь — браузер (`playground/vue/browser/anchored-swipe.spec.ts`). Здесь —
 * проводка: полоса и признак «тянут» на увезённой панели, календарь в своём
 * содержимом, а закрытие жестом доходит до события.
 */
describe('DatePicker · жест', () => {
	const handle = () => document.querySelector('.so-date-picker__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (eventType: string, target: Element, y: number) =>
		target.dispatchEvent(
			new PointerEvent(eventType, {
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

		await mount(undefined, (el) => {
			el.ctrl = ctrl
		})

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')
		expect(node('.so-date-picker__content').parentElement).toBe(panel())
		expect(node('.so-date-picker__calendar').parentElement).toBe(
			node('.so-date-picker__content'),
		)

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
	it('смахнули вниз от поля — закрыта, so:change:open, признак «тянут» на панели', async () => {
		const el = await mount('<div is="so-date-picker" swipe="handle"></div>')
		const state = model(el)

		trigger().click()
		await settle()

		expect(state.open).toBe(true)
		expect(panel().dataset['placement']).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 320))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 145)
		await flush()

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('100px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 150)
		await settle()

		expect(state.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
	})
})

/**
 * Панель ходит с местом: снятый DatePicker уводит её из `body`, а
 * переставленный — собирается заново вместе с ней, над теми же экземплярами.
 */
describe('DatePicker · место панели', () => {
	it('снятый DatePicker уводит панель из body', async () => {
		const el = await mount()

		expect(panel().parentElement).toBe(document.body)

		el.remove()

		expect(document.querySelector('.so-date-picker__panel')).toBeNull()
	})

	it('переставленный — панель снова в body, выбор дня доходит до значения', async () => {
		const ctrl = new TDatePicker()
		const el = await mount(undefined, (node) => {
			node.ctrl = ctrl
		})

		document.body.appendChild(el)
		await settle()

		expect(findAll('.so-date-picker__panel')).toHaveLength(1)
		expect(panel().parentElement).toBe(document.body)

		trigger().click()
		await settle()
		dayCell('2026-09-10').click()
		await settle()

		expect(ctrl.value).toBe('2026-09-10')
		expect(
			find(document, '.so-date-picker__field input[type="hidden"]', HTMLInputElement).value,
		).toBe('2026-09-10')
	})
})
