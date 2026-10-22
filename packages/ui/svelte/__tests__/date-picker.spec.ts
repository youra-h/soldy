/**
 * DatePicker в Svelte — проводка на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`date-picker.spec.ts`) и Solid. Модель — общее
 * полям и календарю, одно значение на две стороны, открытость — проверяет
 * ядро, фокус панели и то, что её открывает, — тест плагинов, раскладку и
 * фокус в браузере — `playground/vue/browser/date-picker.spec.ts`. Здесь
 * важно, что экземпляры ядра доезжают до компонентов (`ctrl`, `engine`),
 * наборы — на свои узлы, а выбор дня и набор в поле на настоящей разметке
 * возвращаются колбэками (`onChangeValue`, `onChangeOpen`).
 *
 * Своё у Svelte — панель и сниппеты. Панель телепортирована в обёртку
 * `Teleport` в `body`, а закрытая — скрыта, но смонтирована вместе с
 * календарём. Сниппет непрозрачен: подвал календарю и очистку полю DatePicker
 * отдаёт, только когда в них есть что рисовать. Серверную разметку —
 * DatePicker полем с кнопкой, без панели — проверяет `ssr.server.spec.ts`.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createRawSnippet, flushSync } from 'svelte'
import { TDatePicker } from '@soldy-ui/core'
import type { ICalendarItem, TDatePickerValue } from '@soldy-ui/core'
import { ruRU, type TLocale } from '@soldy-ui/plugins'
import { DatePicker, type DatePickerProps } from '@soldy-ui/svelte'
import Harness from './DatePicker.test.svelte'
import Surround from './Surround.test.svelte'
import { find, mount, nextFrame, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup } from './snippets.svelte'

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

/** Окружение DatePicker в обёртке: форма или узел со своим обработчиком нажатия. */
type TAround = {
	form?: boolean
	onParentClick?: () => void
}

/**
 * Смонтировать DatePicker без провайдера локали — язык английский — и
 * дождаться кадра: корень плагины получают через `requestAnimationFrame`.
 * Пропсы — живые: смена пропа — присваивание полю.
 */
async function render(
	picker: DatePickerProps = {},
): Promise<{ props: DatePickerProps; mounted: TMounted }> {
	const props = reactiveProps<DatePickerProps>(picker)
	const mounted = mount(DatePicker, props)

	await nextFrame()

	return { props, mounted }
}

/** DatePicker в окружении `around` — пропсы, как у `render`, в поле `picker` обёртки. */
async function renderAround(around: TAround, picker: DatePickerProps): Promise<DatePickerProps> {
	const props = reactiveProps({ ...around, picker })

	mount(Harness, props)
	await nextFrame()

	return props.picker
}

/** DatePicker под провайдером локали `locale`. */
async function renderIn(locale: TLocale, picker: DatePickerProps = {}): Promise<void> {
	mount(Surround, { around: 'locale', control: 'date-picker', locale, datePicker: picker })
	await nextFrame()
}

/**
 * DatePicker, чьи значение и открытость возвращаются пропами, — как
 * `v-model:value` и `v-model:open` у Vue: их держит родитель, а смена
 * приходит колбэками.
 */
async function bound(
	initial: TDatePickerValue,
	picker: DatePickerProps = {},
): Promise<{ value: () => TDatePickerValue; open: () => boolean | undefined }> {
	const { props } = await render({
		...picker,
		value: initial,
		onChangeValue: (payload) => {
			props.value = payload.newValue
		},
		open: false,
		onChangeOpen: (next) => {
			props.open = next
		},
	})

	return { value: () => props.value, open: () => props.open }
}

/** Узел по селектору в документе. */
const node = (selector: string) => find(document, selector, HTMLElement)

const nodes = (selector: string): HTMLElement[] =>
	[...document.querySelectorAll(selector)].filter(
		(element): element is HTMLElement => element instanceof HTMLElement,
	)

/** Ячейка дня по его имени — полной дате, как её прочтёт скринридер. */
function dayCell(date: string): HTMLElement {
	const label = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
		Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8))),
	)

	return node(`.so-calendar-item[aria-label="${label}"]`)
}

const root = () => node('.so-date-picker')
const trigger = () => node('.so-date-picker__trigger')
const panel = () => node('.so-date-picker__panel')
/** Открыта ли панель: она всегда в документе и скрывается через `display: none`. */
const isOpen = () => panel().style.display !== 'none'

/** Значения скрытых полей формы по порядку. */
const hiddenValues = (scope: string) =>
	[...document.querySelectorAll(`${scope} input[type="hidden"]`)].map((input) =>
		input instanceof HTMLInputElement ? input.value : null,
	)

/** Текст между узлами — пробел, который Svelte оставил бы в разметке. */
const textsOf = (element: Element) =>
	[...element.childNodes].filter((child) => child instanceof Text && child.data.length > 0)

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	from.dispatchEvent(event)
	flushSync()

	return event
}

/** Набрать строку с узла под фокусом документа. */
function type(keys: string): void {
	for (const key of keys) {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		press(active, key)
	}
}

describe('DatePicker · одна дата', () => {
	it('поле с кнопкой календаря в сниппете, панель — диалог в body', async () => {
		const { mounted } = await render({ id: 'when', aria_label: 'Дата заезда' })

		const field = node('.so-date-picker__field')

		expect(root().classList.contains('so-date-picker--single')).toBe(true)
		expect(root().id).toBe('when')
		expect(root().hasAttribute('role')).toBe(false)
		// Группа частей — само поле: имя DatePicker уходит ему
		expect(field.getAttribute('role')).toBe('group')
		expect(field.getAttribute('aria-label')).toBe('Дата заезда')
		expect(field.querySelector('.so-date-input__trailing .so-date-picker__trigger')).toBe(
			trigger(),
		)
		// Панель телепортирована: в обёртке `Teleport` в `body`, а не в корне
		expect(mounted.container.querySelector('.so-date-picker__panel')).toBeNull()
		expect(document.body.contains(panel())).toBe(true)
		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('aria-label')).toBe('Choose date')
		expect(isOpen()).toBe(false)
	})

	it('кнопка — связка с панелью по id и вид «нажат», пока панель открыта', async () => {
		await render()

		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-label')).toBe('Choose date')
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().id).not.toBe('')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset['selected']).toBe('false')

		trigger().click()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset['selected']).toBe('true')
		expect(root().dataset['open']).toBe('true')
	})

	it('выбор дня — onChangeValue, дата в поле, панель закрывается', async () => {
		const { value, open } = await bound(undefined)

		trigger().click()
		await nextFrame()
		expect(open()).toBe(true)

		dayCell('2026-09-10').click()
		await nextFrame()

		expect(value()).toBe('2026-09-10')
		expect(open()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])
	})

	it('набор в поле — onChangeValue и выбранный день в календаре', async () => {
		const { value } = await bound(undefined)

		// en-US: месяц, день, год
		node('.so-date-input__segment[data-type="month"]').focus()
		type('09122026')
		await nextFrame()

		expect(value()).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
	})

	it('выключенный — кнопка выключена, панель не открывается', async () => {
		await render({ disabled: true })

		expect(trigger().hasAttribute('disabled')).toBe(true)
		expect(node('.so-date-picker__field').dataset['disabled']).toBe('true')
	})

	it('атрибуты снаружи — корню, а не полю', async () => {
		await render({ class: 'mine', 'data-probe': '1', title: 'Срок' })

		expect([...root().classList].at(-1)).toBe('mine')
		expect(root().dataset['probe']).toBe('1')
		expect(root().title).toBe('Срок')
		expect(node('.so-date-picker__field').hasAttribute('data-probe')).toBe(false)
	})
})

describe('DatePicker · диапазон', () => {
	it('корень — группа с именем, поля концов названы, тире немое', async () => {
		await render({ mode: 'range', aria_label: 'Поездка' })

		const start = node('.so-date-picker__start')
		const end = node('.so-date-picker__end')

		expect(root().classList.contains('so-date-picker--range')).toBe(true)
		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Поездка')
		expect(start.getAttribute('aria-label')).toBe('Start date')
		expect(end.getAttribute('aria-label')).toBe('End date')
		expect(node('.so-date-picker__dash').getAttribute('aria-hidden')).toBe('true')
		// Кнопка — после поля конца, не в его сниппете
		expect(end.nextElementSibling).toBe(trigger())
		expect(nodes('.so-date-picker__field')).toHaveLength(0)
	})

	/** Пробел между блоками Svelte оставил бы текстом в коробке диапазона. */
	it('в коробке диапазона узлы вплотную', async () => {
		await render({ mode: 'range', clearable: true })

		expect(textsOf(root())).toEqual([])
	})

	it('два дня в календаре — пара в onChangeValue и в поля, панель — до второго дня', async () => {
		const { value } = await bound(undefined, { mode: 'range' })

		trigger().click()
		await nextFrame()

		dayCell('2026-09-14').click()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(value()).toBeUndefined()

		dayCell('2026-09-10').click()
		await nextFrame()

		expect(value()).toEqual(['2026-09-10', '2026-09-14'])
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker')).toEqual(['2026-09-10', '2026-09-14'])
	})

	it('смена режима перерисовывает поля нового режима', async () => {
		const { props } = await render({ mode: 'single', value: '2026-09-10' })

		props.mode = 'range'
		await nextFrame()

		expect(nodes('.so-date-picker__field')).toHaveLength(0)
		expect(hiddenValues('.so-date-picker__start')).toEqual(['2026-09-10'])
	})
})

/**
 * Выбор с подтверждением: модель — черновик в календаре, «OK» и сброс при
 * закрытии — проверяет ядро. Здесь — подвал на настоящей разметке: он есть
 * только при `confirmable`, текст кнопок — строки локали поддерева, «OK»
 * гаснет посреди диапазона, а нажатия доходят до колбэков.
 */
describe('DatePicker · выбор с подтверждением', () => {
	const footer = () => document.querySelector('.so-date-picker__panel .so-calendar__footer')
	const cancel = () => node('.so-date-picker__cancel')
	const confirm = () => node('.so-date-picker__confirm')

	/** Открытый DatePicker с подтверждением. */
	async function opened(initial: TDatePickerValue, picker: DatePickerProps = {}) {
		const result = await bound(initial, { confirmable: true, ...picker })

		trigger().click()
		await nextFrame()

		return result
	}

	it('без confirmable подвала нет; с ним — «Отмена», потом «OK», в подвале календаря', async () => {
		const ctrl = new TDatePicker()

		await render({ ctrl })

		expect(footer()).toBeNull()

		ctrl.confirmable = true
		await nextFrame()

		expect([...(footer()?.children ?? [])]).toEqual([cancel(), confirm()])
		expect(cancel().textContent?.trim()).toBe('Cancel')
		expect(confirm().textContent?.trim()).toBe('OK')
		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(textsOf(node('.so-calendar__footer'))).toEqual([])

		ctrl.confirmable = false
		await nextFrame()

		expect(footer()).toBeNull()
	})

	it('текст кнопок — от локали поддерева', async () => {
		await renderIn(ruRU, { confirmable: true })

		expect(cancel().textContent?.trim()).toBe(ruRU.translations.datePicker.cancel)
		expect(confirm().textContent?.trim()).toBe(ruRU.translations.datePicker.confirm)
	})

	it('выбор дня — черновик: значение прежнее, панель открыта; «OK» — значение и закрытие', async () => {
		const { value, open } = await opened('2026-09-10')

		dayCell('2026-09-12').click()
		await nextFrame()

		expect(value()).toBe('2026-09-10')
		expect(open()).toBe(true)
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])

		confirm().click()
		await nextFrame()

		expect(value()).toBe('2026-09-12')
		expect(open()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-12'])
	})

	it('«Отмена» — панель закрыта, черновик сброшен, значение прежнее', async () => {
		const { value, open } = await opened('2026-09-10')

		dayCell('2026-09-12').click()
		await nextFrame()

		cancel().click()
		await nextFrame()

		expect(open()).toBe(false)
		expect(value()).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('false')
	})

	it('диапазон: «OK» гаснет на первом дне и загорается на втором', async () => {
		const { value } = await opened(undefined, { mode: 'range' })

		dayCell('2026-09-14').click()
		await nextFrame()

		expect(confirm().hasAttribute('disabled')).toBe(true)

		dayCell('2026-09-10').click()
		await nextFrame()

		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(value()).toBeUndefined()

		confirm().click()
		await nextFrame()

		expect(value()).toEqual(['2026-09-10', '2026-09-14'])
	})
})

/**
 * Кнопка очистки — DatePicker'а: он сам поле (база `TClearable`), и кнопка у
 * него одна на значение. У одной даты она стоит в сниппете `clear` поля —
 * первой у его конца, перед кнопкой календаря, — у диапазона одна на период,
 * после поля конца. Своей кнопки поля не рисуют. Что очистка делает с моделью
 * — у обоих концов, и у набранного не до конца, — проверяет ядро
 * (`core/__tests__/date-picker.spec.ts`), форму кнопки — браузерный прогон.
 */
describe('DatePicker · кнопка очистки', () => {
	const clearButtons = () => nodes('.so-date-picker__clear')
	const clearButton = () => node('.so-date-picker__clear')

	/** Своя кнопка в сниппете `clear`: зовёт команду из scope голой функцией. */
	const probe = () =>
		createRawSnippet((scope: () => { clear: () => void }) => ({
			render: () => '<button class="probe-clear"></button>',
			setup(button) {
				button.addEventListener('click', () => scope().clear())
			},
		}))

	it('без clearable кнопки нет — ни у одной даты, ни у диапазона', async () => {
		const { props } = await render({ mode: 'single', value: '2026-09-10' })

		expect(clearButtons()).toHaveLength(0)

		props.mode = 'range'
		await nextFrame()

		expect(clearButtons()).toHaveLength(0)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('одна дата: первой в сниппете у конца поля, перед кнопкой календаря; у поля своей нет', async () => {
		await render({ clearable: true, name: 'Заезд' })

		const slot = node('.so-date-picker__field .so-date-input__trailing')

		expect([...slot.children]).toEqual([clearButton(), trigger()])
		expect(clearButton().getAttribute('aria-label')).toBe('Clear Заезд')
		expect(root().classList.contains('so-date-picker--clearable')).toBe(true)
		expect(node('.so-date-picker__field').classList.contains('so-date-input--clearable')).toBe(
			false,
		)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: одна на период — после поля конца, перед кнопкой календаря', async () => {
		await render({ mode: 'range', clearable: true })

		expect(clearButtons()).toHaveLength(1)
		expect(node('.so-date-picker__end').nextElementSibling).toBe(clearButton())
		expect(clearButton().nextElementSibling).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear')
		// У полей концов своих кнопок нет: `clearable` им не уходит
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: клик очищает оба конца — колбэк видит пустое, клик не всплывает', async () => {
		const parentClick = vi.fn()
		const props = await renderAround(
			{ onParentClick: parentClick },
			{
				mode: 'range',
				clearable: true,
				value: ['2026-09-10', '2026-09-14'],
				onChangeValue: (payload) => {
					props.value = payload.newValue
				},
			},
		)

		clearButton().click()
		await nextFrame()

		expect(props.value).toBeUndefined()
		expect(hiddenValues('.so-date-picker')).toEqual(['', ''])
		expect(parentClick).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду DatePicker: clear — у него, в обоих режимах', async () => {
		const ctrl = new TDatePicker({ clearable: true, value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render({ ctrl })

		clearButton().click()
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)

		ctrl.mode = 'range'
		ctrl.value = ['2026-09-10', '2026-09-14']
		await nextFrame()

		clearButton().click()
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(2)
	})

	it('размер — DatePicker, выключена — вместе с ним, readonly её не гасит', async () => {
		const { props } = await render({
			clearable: true,
			size: 'lg',
			readonly: true,
			disabled: false,
		})

		expect(clearButton().classList.contains('so-button--size-lg')).toBe(true)
		expect(clearButton().hasAttribute('disabled')).toBe(false)

		props.disabled = true
		await nextFrame()

		expect(clearButton().hasAttribute('disabled')).toBe(true)
	})

	it('своя кнопка — сниппет clear с командой DatePicker в scope, у одной даты — в сниппете поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render({ ctrl, clear: probe() })

		expect(
			document.querySelector(
				'.so-date-picker__field .so-date-input__trailing > .probe-clear',
			),
		).not.toBeNull()
		expect(clearButtons()).toHaveLength(0)

		node('.probe-clear').click()
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)
	})

	it('своя кнопка у диапазона — после поля конца, вместо встроенной', async () => {
		await render({ mode: 'range', clearable: true, clear: probe() })

		expect(node('.so-date-picker__end').nextElementSibling).toBe(node('.probe-clear'))
		expect(clearButtons()).toHaveLength(0)
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

		await render({ ctrl })

		const field = node('.so-date-picker__field')
		const parts = () => nodes('.so-date-picker__field .so-date-input__segment')

		expect(field.dataset['invalid']).toBeUndefined()
		expect(parts().some((part) => part.hasAttribute('aria-invalid'))).toBe(false)

		ctrl.unavailable = (date) => date === '2026-09-15'
		await nextFrame()

		expect(field.dataset['invalid']).toBe('true')
		expect(parts().every((part) => part.getAttribute('aria-invalid') === 'true')).toBe(true)
	})

	it('конец раньше начала — ошибка у поля конца, у начала её нет', async () => {
		await render({ mode: 'range', value: ['2026-09-20', '2026-09-10'] })

		expect(node('.so-date-picker__end').dataset['invalid']).toBe('true')
		expect(node('.so-date-picker__start').dataset['invalid']).toBeUndefined()
	})
})

/**
 * Проверка набора — проп DatePicker'а: полям его отдаёт ядро, а разметка на
 * `<DateInput>` его не пробрасывает. Здесь — весь путь: проп из разметки —
 * ядру, ядро — полю, и смонтированный DateInput, которому проп не задан, не
 * перетирает его своим умолчанием. Та же пара, что «00» на дне у DateInput
 * (`date-input.spec.ts`), и на том же русском формате: день, месяц, год.
 */
describe('DatePicker · проверка набора', () => {
	/** Часть поля одной даты по типу. */
	const segment = (part: string) =>
		node(`.so-date-picker__field .so-date-input__segment[data-type="${part}"]`)

	it('«00» на дне без validate — день 00, фокус уходит на месяц', async () => {
		await renderIn(ruRU)

		segment('day').focus()
		type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('«00» на дне с validate — фокус стоит, часть ждёт цифры', async () => {
		await renderIn(ruRU, { validate: true })

		segment('day').focus()
		type('00')

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

	it('одна дата — под name', async () => {
		await renderAround(
			{ form: true },
			{ name: 'date', startName: 'from', endName: 'to', value: '2026-09-10' },
		)

		expect(entries()).toEqual([['date', '2026-09-10']])
	})

	it('концы диапазона — под startName и endName', async () => {
		const props = await renderAround(
			{ form: true },
			{
				mode: 'range',
				name: 'date',
				startName: 'from',
				endName: 'to',
				value: ['2026-09-10', '2026-09-14'],
			},
		)

		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', '2026-09-14'],
		])

		props.startName = 'checkIn'
		props.endName = 'checkOut'
		await nextFrame()

		expect(entries()).toEqual([
			['checkIn', '2026-09-10'],
			['checkOut', '2026-09-14'],
		])
	})

	it('недонабранный период: каждый конец уходит своим значением', async () => {
		const ctrl = new TDatePicker({ mode: 'range', startName: 'from', endName: 'to' })

		await renderAround({ form: true }, { ctrl })

		ctrl.start.paste('2026-09-10')
		await nextFrame()

		// Значения у DatePicker ещё нет, а начало в форме — есть
		expect(ctrl.value).toBeUndefined()
		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', ''],
		])
	})

	it('без имён концов диапазон в форму не уходит', async () => {
		await renderAround(
			{ form: true },
			{ mode: 'range', name: 'date', value: ['2026-09-10', '2026-09-14'] },
		)

		expect(entries()).toEqual([])
	})
})

describe('DatePicker · экземпляры ядра', () => {
	it('внешний ctrl: поле, календарь и движок — его', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })

		await render({ ctrl })

		expect(ctrl.engine.options.get('owner')).toBe(ctrl.calendar)
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')

		ctrl.engine.extensions.selection.chooseDate('2026-09-20')
		await nextFrame()

		expect(ctrl.value).toBe('2026-09-20')
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-20'])
	})
})

describe('DatePicker · слоты', () => {
	it('trigger-icon подменяет значок кнопки', async () => {
		await render({ 'trigger-icon': markup('<span class="so-test-icon">📅</span>') })

		expect(trigger().querySelector('.so-test-icon')).not.toBeNull()
	})

	it('item уходит в дни календаря со scope { item }', async () => {
		await render({
			item: scopeMarkup(
				(scope: { item: ICalendarItem }) =>
					`<span class="so-test-day">«${scope.item.text}»</span>`,
			),
		})

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('«10»')
	})

	it('item получает и номер дня — scope слота календаря целиком', async () => {
		await render({
			item: scopeMarkup(
				(scope: { item: ICalendarItem; text: string }) =>
					`<span class="so-test-day">${scope.text}·${scope.item.date.slice(5)}</span>`,
			),
		})

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('10·09-10')
	})

	it('без слота item день рисует свой номер', async () => {
		await render()

		expect(dayCell('2026-09-10').textContent?.trim()).toBe('10')
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Правила жеста проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`), раскладку, прокрутку и настоящую
 * мышь — браузер (`playground/vue/browser/anchored-swipe.spec.ts`). Здесь —
 * проводка: полоса и признак «тянут» на телепортированной панели, календарь в
 * своём содержимом, а закрытие жестом доходит до колбэка.
 */
describe('DatePicker · жест', () => {
	const handle = () => document.querySelector('.so-date-picker__handle')

	/** Указатель мышью в точке по вертикали — как его слушает плагин жеста. */
	const pointer = (eventType: string, target: Element, y: number) => {
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
		flushSync()
	}

	it('без жеста полосы нет; с жестом — первая в панели, немая; календарь — в содержимом', async () => {
		const ctrl = new TDatePicker()

		await render({ ctrl })

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')
		expect(node('.so-date-picker__content').parentElement).toBe(panel())
		expect(node('.so-date-picker__calendar').parentElement).toBe(
			node('.so-date-picker__content'),
		)

		ctrl.swipe = 'handle'
		await nextFrame()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
		expect(textsOf(panel())).toEqual([])
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после flip
	 * плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по полосе
	 * вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от поля — закрыта, колбэк видит закрытие, признак «тянут» на панели', async () => {
		const { open } = await bound(undefined, { swipe: 'handle' })

		trigger().click()
		await nextFrame()

		expect(open()).toBe(true)
		expect(panel().dataset['placement']).toBe('bottom-start')

		vi.spyOn(panel(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 40, 300, 320))

		const grip = handle()

		if (!grip) throw new Error('полосы нет')

		pointer('pointerdown', grip, 45)
		pointer('pointermove', panel(), 145)

		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('100px')
		expect(panel().dataset['swiping']).toBe('true')

		pointer('pointerup', panel(), 150)
		await nextFrame()

		expect(open()).toBe(false)
		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
	})
})
