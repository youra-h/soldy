/**
 * DatePicker в React — проводка на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`date-picker.spec.ts`). Модель — общее полям и
 * календарю, одно значение на две стороны, открытость — проверяет ядро, фокус
 * панели и то, что её открывает, — тест плагинов, раскладку и фокус в
 * браузере — `playground/vue/browser/date-picker.spec.ts`. Здесь важно, что
 * экземпляры ядра доезжают до компонентов (`ctrl`, `engine`), наборы — на
 * свои узлы, а выбор дня и набор в поле на настоящей разметке возвращаются
 * колбэками (`onChangeValue`, `onChangeOpen`).
 *
 * Своё у React — панель и пересборка. Панель телепортирована в обёртку
 * портала в `body`, а закрытая — скрыта, но смонтирована вместе с
 * календарём; на сервере портала нет, и панель с календарём появляются после
 * гидратации. Поля и календарь ключуются своими экземплярами: DatePicker без
 * `ctrl` StrictMode пересобирает с новыми полями, календарём и движком, и
 * компоненты встают над новыми. Отсюда группа «React». Обновления — внутри
 * `act`: событие, сменившее состояние мимо него, роняет тест сторожем консоли.
 *
 * Сегодня во всех тестах — суббота 2026-09-26, как в тестах ядра.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { StrictMode, act, useState, type ReactElement, type ReactNode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { TDatePicker } from '@soldy-ui/core'
import type { ICalendarItem, TDatePickerMode, TDatePickerValue } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { DatePicker, LocaleProvider, type DatePickerProps } from '@soldy-ui/react'
import { find, mount, nextFrame, track } from './mount'

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

/** Смонтировать разметку и дождаться кадра: корень плагины получают через `requestAnimationFrame`. */
async function render(element: ReactElement) {
	const mounted = mount(element)

	await nextFrame()

	return mounted
}

/** Что DatePicker вернул колбэками: последнее значение и открытость. */
type TBound = { value: TDatePickerValue; open: boolean }

/**
 * DatePicker, чьи значение и открытость возвращаются пропами, — как
 * `v-model:value` и `v-model:open` у Vue: их держит состояние родителя, а
 * смена приходит колбэками.
 */
function Bound({
	initial,
	seen,
	...props
}: DatePickerProps & { initial: TDatePickerValue; seen: TBound }): ReactElement {
	const [value, setValue] = useState<TDatePickerValue>(initial)
	const [open, setOpen] = useState(false)

	return (
		<DatePicker
			{...props}
			value={value}
			onChangeValue={(payload) => {
				seen.value = payload.newValue
				setValue(payload.newValue)
			}}
			open={open}
			onChangeOpen={(next) => {
				seen.open = next
				setOpen(next)
			}}
		/>
	)
}

async function bound(
	initial: TDatePickerValue,
	props: DatePickerProps = {},
	wrap: (element: ReactElement) => ReactElement = (element) => element,
): Promise<TBound> {
	const seen: TBound = { value: initial, open: false }

	await render(wrap(<Bound {...props} initial={initial} seen={seen} />))

	return seen
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

/** Клик — внутри `act`: он меняет состояние DatePicker. */
function click(target: HTMLElement): void {
	act(() => target.click())
}

/** Фокус меняет состояние поля — внутри `act`. */
function focus(target: HTMLElement): void {
	act(() => target.focus())
}

/** Нажатие клавиши с узла, как у пользователя: событие всплывает до корня. */
function press(from: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	act(() => {
		from.dispatchEvent(event)
	})

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
	it('поле с кнопкой календаря в слоте, панель — диалог в body', async () => {
		const { container } = await render(<DatePicker id="when" aria_label="Дата заезда" />)

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
		// Панель телепортирована: в обёртке портала в `body`, а не в корне
		expect(container.querySelector('.so-date-picker__panel')).toBeNull()
		expect(document.body.contains(panel())).toBe(true)
		expect(panel().getAttribute('role')).toBe('dialog')
		expect(panel().getAttribute('aria-modal')).toBe('true')
		expect(panel().getAttribute('aria-label')).toBe('Choose date')
		expect(isOpen()).toBe(false)
	})

	it('кнопка — связка с панелью по id и вид «нажат», пока панель открыта', async () => {
		await render(<DatePicker />)

		expect(trigger().getAttribute('aria-haspopup')).toBe('dialog')
		expect(trigger().getAttribute('aria-label')).toBe('Choose date')
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().id).not.toBe('')
		expect(trigger().getAttribute('aria-expanded')).toBe('false')
		expect(trigger().dataset['selected']).toBe('false')

		click(trigger())
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(trigger().getAttribute('aria-expanded')).toBe('true')
		expect(trigger().dataset['selected']).toBe('true')
		expect(root().dataset['open']).toBe('true')
	})

	it('выбор дня — onChangeValue, дата в поле, панель закрывается', async () => {
		const seen = await bound(undefined)

		click(trigger())
		await nextFrame()
		expect(seen.open).toBe(true)

		click(dayCell('2026-09-10'))
		await nextFrame()

		expect(seen.value).toBe('2026-09-10')
		expect(seen.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])
	})

	it('набор в поле — onChangeValue и выбранный день в календаре', async () => {
		const seen = await bound(undefined)

		// en-US: месяц, день, год
		focus(node('.so-date-input__segment[data-type="month"]'))
		type('09122026')
		await nextFrame()

		expect(seen.value).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
	})

	it('выключенный — кнопка выключена, панель не открывается', async () => {
		await render(<DatePicker disabled />)

		expect(trigger().hasAttribute('disabled')).toBe(true)
		expect(node('.so-date-picker__field').dataset['disabled']).toBe('true')
	})

	it('атрибуты снаружи — корню, а не полю', async () => {
		await render(<DatePicker className="mine" data-probe="1" title="Срок" />)

		expect([...root().classList].at(-1)).toBe('mine')
		expect(root().dataset['probe']).toBe('1')
		expect(root().title).toBe('Срок')
		expect(node('.so-date-picker__field').hasAttribute('data-probe')).toBe(false)
	})
})

describe('DatePicker · диапазон', () => {
	it('корень — группа с именем, поля концов названы, тире немое', async () => {
		await render(<DatePicker mode="range" aria_label="Поездка" />)

		const start = node('.so-date-picker__start')
		const end = node('.so-date-picker__end')

		expect(root().classList.contains('so-date-picker--range')).toBe(true)
		expect(root().getAttribute('role')).toBe('group')
		expect(root().getAttribute('aria-label')).toBe('Поездка')
		expect(start.getAttribute('aria-label')).toBe('Start date')
		expect(end.getAttribute('aria-label')).toBe('End date')
		expect(node('.so-date-picker__dash').getAttribute('aria-hidden')).toBe('true')
		// Кнопка — после поля конца, не в его слоте
		expect(end.nextElementSibling).toBe(trigger())
		expect(nodes('.so-date-picker__field')).toHaveLength(0)
	})

	it('два дня в календаре — пара в onChangeValue и в поля, панель — до второго дня', async () => {
		const seen = await bound(undefined, { mode: 'range' })

		click(trigger())
		await nextFrame()

		click(dayCell('2026-09-14'))
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(seen.value).toBeUndefined()

		click(dayCell('2026-09-10'))
		await nextFrame()

		expect(seen.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker')).toEqual(['2026-09-10', '2026-09-14'])
	})

	it('смена режима перерисовывает поля нового режима', async () => {
		const view = (mode: TDatePickerMode) => <DatePicker mode={mode} value="2026-09-10" />
		const { render: rerender } = await render(view('single'))

		rerender(view('range'))
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
	async function opened(initial: TDatePickerValue, props: DatePickerProps = {}) {
		const seen = await bound(initial, { confirmable: true, ...props })

		click(trigger())
		await nextFrame()

		return seen
	}

	it('без confirmable подвала нет; с ним — «Отмена», потом «OK», в подвале календаря', async () => {
		const ctrl = new TDatePicker()

		await render(<DatePicker ctrl={ctrl} />)

		expect(footer()).toBeNull()

		act(() => {
			ctrl.confirmable = true
		})
		await nextFrame()

		const children = [...(footer()?.children ?? [])]

		expect(children).toHaveLength(2)
		expect(children[0]).toBe(cancel())
		expect(children[1]).toBe(confirm())
		expect(cancel().textContent?.trim()).toBe('Cancel')
		expect(confirm().textContent?.trim()).toBe('OK')
		expect(confirm().hasAttribute('disabled')).toBe(false)

		act(() => {
			ctrl.confirmable = false
		})
		await nextFrame()

		expect(footer()).toBeNull()
	})

	it('текст кнопок — от локали поддерева', async () => {
		await render(
			<LocaleProvider locale={ruRU}>
				<DatePicker confirmable />
			</LocaleProvider>,
		)

		expect(cancel().textContent?.trim()).toBe(ruRU.translations.datePicker.cancel)
		expect(confirm().textContent?.trim()).toBe(ruRU.translations.datePicker.confirm)
	})

	it('выбор дня — черновик: значение прежнее, панель открыта; «OK» — значение и закрытие', async () => {
		const seen = await opened('2026-09-10')

		click(dayCell('2026-09-12'))
		await nextFrame()

		expect(seen.value).toBe('2026-09-10')
		expect(seen.open).toBe(true)
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])

		click(confirm())
		await nextFrame()

		expect(seen.value).toBe('2026-09-12')
		expect(seen.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-12'])
	})

	it('«Отмена» — панель закрыта, черновик сброшен, значение прежнее', async () => {
		const seen = await opened('2026-09-10')

		click(dayCell('2026-09-12'))
		await nextFrame()

		click(cancel())
		await nextFrame()

		expect(seen.open).toBe(false)
		expect(seen.value).toBe('2026-09-10')
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('false')
	})

	it('диапазон: «OK» гаснет на первом дне и загорается на втором', async () => {
		const seen = await opened(undefined, { mode: 'range' })

		click(dayCell('2026-09-14'))
		await nextFrame()

		expect(confirm().hasAttribute('disabled')).toBe(true)

		click(dayCell('2026-09-10'))
		await nextFrame()

		expect(confirm().hasAttribute('disabled')).toBe(false)
		expect(seen.value).toBeUndefined()

		click(confirm())
		await nextFrame()

		expect(seen.value).toEqual(['2026-09-10', '2026-09-14'])
	})
})

/**
 * Кнопка очистки — DatePicker'а: он сам поле (база `TClearable`), и кнопка у
 * него одна на значение. У одной даты она стоит в слоте `clear` поля — первой
 * у его конца, перед кнопкой календаря, — у диапазона одна на период, после
 * поля конца. Своей кнопки поля не рисуют. Что очистка делает с моделью — у
 * обоих концов, и у набранного не до конца, — проверяет ядро
 * (`core/__tests__/date-picker.spec.ts`), форму кнопки — браузерный прогон.
 */
describe('DatePicker · кнопка очистки', () => {
	const clearButtons = () => nodes('.so-date-picker__clear')
	const clearButton = () => node('.so-date-picker__clear')

	/** Своя кнопка в слоте `clear`: зовёт команду из scope голой функцией. */
	const probe = ({ clear }: { clear: () => void }): ReactNode => (
		<button className="probe-clear" onClick={() => clear()} />
	)

	it('без clearable кнопки нет — ни у одной даты, ни у диапазона', async () => {
		const view = (mode: TDatePickerMode) => <DatePicker mode={mode} value="2026-09-10" />
		const { render: rerender } = await render(view('single'))

		expect(clearButtons()).toHaveLength(0)

		rerender(view('range'))
		await nextFrame()

		expect(clearButtons()).toHaveLength(0)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('одна дата: первой в слоте у конца поля, перед кнопкой календаря; у поля своей нет', async () => {
		await render(<DatePicker clearable name="Заезд" />)

		const slot = node('.so-date-picker__field .so-date-input__trailing')

		expect(slot.children).toHaveLength(2)
		expect(slot.children[0]).toBe(clearButton())
		expect(slot.children[1]).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear Заезд')
		expect(root().classList.contains('so-date-picker--clearable')).toBe(true)
		expect(node('.so-date-picker__field').classList.contains('so-date-input--clearable')).toBe(
			false,
		)
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: одна на период — после поля конца, перед кнопкой календаря', async () => {
		await render(<DatePicker mode="range" clearable />)

		expect(clearButtons()).toHaveLength(1)
		expect(node('.so-date-picker__end').nextElementSibling).toBe(clearButton())
		expect(clearButton().nextElementSibling).toBe(trigger())
		expect(clearButton().getAttribute('aria-label')).toBe('Clear')
		// У полей концов своих кнопок нет: `clearable` им не уходит
		expect(nodes('.so-date-input__clear')).toHaveLength(0)
	})

	it('диапазон: клик очищает оба конца — колбэк видит пустое, клик не всплывает', async () => {
		const parentClick = vi.fn()

		const seen = await bound(
			['2026-09-10', '2026-09-14'],
			{ mode: 'range', clearable: true },
			(element) => <div onClick={parentClick}>{element}</div>,
		)

		click(clearButton())
		await nextFrame()

		expect(seen.value).toBeUndefined()
		expect(hiddenValues('.so-date-picker')).toEqual(['', ''])
		expect(parentClick).not.toHaveBeenCalled()
	})

	it('кнопка зовёт команду DatePicker: clear — у него, в обоих режимах', async () => {
		const ctrl = new TDatePicker({ clearable: true, value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render(<DatePicker ctrl={ctrl} />)

		click(clearButton())
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)

		act(() => {
			ctrl.mode = 'range'
			ctrl.value = ['2026-09-10', '2026-09-14']
		})
		await nextFrame()

		click(clearButton())
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(2)
	})

	it('размер — DatePicker, выключена — вместе с ним, readonly её не гасит', async () => {
		const view = (disabled: boolean) => (
			<DatePicker clearable size="lg" readonly disabled={disabled} />
		)
		const { render: rerender } = await render(view(false))

		expect(clearButton().classList.contains('so-button--size-lg')).toBe(true)
		expect(clearButton().hasAttribute('disabled')).toBe(false)

		rerender(view(true))
		await nextFrame()

		expect(clearButton().hasAttribute('disabled')).toBe(true)
	})

	it('своя кнопка — слот clear с командой DatePicker в scope, у одной даты — в слоте поля', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })
		const clear = vi.fn()

		ctrl.events.on('clear', clear)

		await render(<DatePicker ctrl={ctrl} clear={probe} />)

		expect(
			document.querySelector(
				'.so-date-picker__field .so-date-input__trailing > .probe-clear',
			),
		).not.toBeNull()
		expect(clearButtons()).toHaveLength(0)

		click(node('.probe-clear'))
		await nextFrame()

		expect(ctrl.value).toBeUndefined()
		expect(clear).toHaveBeenCalledTimes(1)
	})

	it('своя кнопка у диапазона — после поля конца, вместо встроенной', async () => {
		await render(<DatePicker mode="range" clearable clear={probe} />)

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

		await render(<DatePicker ctrl={ctrl} />)

		const field = node('.so-date-picker__field')
		const parts = () => nodes('.so-date-picker__field .so-date-input__segment')

		expect(field.dataset['invalid']).toBeUndefined()
		expect(parts().some((part) => part.hasAttribute('aria-invalid'))).toBe(false)

		act(() => {
			ctrl.unavailable = (date) => date === '2026-09-15'
		})
		await nextFrame()

		expect(field.dataset['invalid']).toBe('true')
		expect(parts().every((part) => part.getAttribute('aria-invalid') === 'true')).toBe(true)
	})

	it('конец раньше начала — ошибка у поля конца, у начала её нет', async () => {
		await render(<DatePicker mode="range" value={['2026-09-20', '2026-09-10']} />)

		expect(node('.so-date-picker__end').dataset['invalid']).toBe('true')
		expect(node('.so-date-picker__start').dataset['invalid']).toBeUndefined()
	})
})

/**
 * Проверка набора — проп DatePicker'а: полям его отдаёт ядро, а разметка на
 * `<DateInput>` его не пробрасывает. Здесь — весь путь: проп из разметки —
 * ядру, ядро — полю, и смонтированный DateInput, которому проп не задан, не
 * перетирает его своим умолчанием. Та же пара, что «00» на дне у DateInput
 * (`date-input.spec.tsx`), и на том же русском формате: день, месяц, год.
 */
describe('DatePicker · проверка набора', () => {
	/** Часть поля одной даты по типу. */
	const segment = (part: string) =>
		node(`.so-date-picker__field .so-date-input__segment[data-type="${part}"]`)

	/** DatePicker — в провайдере русской локали. */
	const russian = (validate?: boolean) =>
		render(
			<LocaleProvider locale={ruRU}>
				<DatePicker validate={validate} />
			</LocaleProvider>,
		)

	it('«00» на дне без validate — день 00, фокус уходит на месяц', async () => {
		await russian()

		focus(segment('day'))
		type('00')

		expect(segment('day').textContent).toBe('00')
		expect(document.activeElement).toBe(segment('month'))
	})

	it('«00» на дне с validate — фокус стоит, часть ждёт цифры', async () => {
		await russian(true)

		focus(segment('day'))
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
		await render(
			<form>
				<DatePicker name="date" startName="from" endName="to" value="2026-09-10" />
			</form>,
		)

		expect(entries()).toEqual([['date', '2026-09-10']])
	})

	it('концы диапазона — под startName и endName', async () => {
		const view = (startName: string, endName: string) => (
			<form>
				<DatePicker
					mode="range"
					name="date"
					startName={startName}
					endName={endName}
					value={['2026-09-10', '2026-09-14']}
				/>
			</form>
		)
		const { render: rerender } = await render(view('from', 'to'))

		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', '2026-09-14'],
		])

		rerender(view('checkIn', 'checkOut'))
		await nextFrame()

		expect(entries()).toEqual([
			['checkIn', '2026-09-10'],
			['checkOut', '2026-09-14'],
		])
	})

	it('недонабранный период: каждый конец уходит своим значением', async () => {
		const ctrl = new TDatePicker({ mode: 'range', startName: 'from', endName: 'to' })

		await render(
			<form>
				<DatePicker ctrl={ctrl} />
			</form>,
		)

		act(() => {
			ctrl.start.paste('2026-09-10')
		})
		await nextFrame()

		// Значения у DatePicker ещё нет, а начало в форме — есть
		expect(ctrl.value).toBeUndefined()
		expect(entries()).toEqual([
			['from', '2026-09-10'],
			['to', ''],
		])
	})

	it('без имён концов диапазон в форму не уходит', async () => {
		await render(
			<form>
				<DatePicker mode="range" name="date" value={['2026-09-10', '2026-09-14']} />
			</form>,
		)

		expect(entries()).toEqual([])
	})
})

describe('DatePicker · экземпляры ядра', () => {
	it('внешний ctrl: поле, календарь и движок — его', async () => {
		const ctrl = new TDatePicker({ value: '2026-09-10' })

		await render(<DatePicker ctrl={ctrl} />)

		expect(ctrl.engine.options.get('owner')).toBe(ctrl.calendar)
		expect(dayCell('2026-09-10').dataset['selected']).toBe('true')

		act(() => {
			ctrl.engine.extensions.selection.chooseDate('2026-09-20')
		})
		await nextFrame()

		expect(ctrl.value).toBe('2026-09-20')
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-20'])
	})
})

describe('DatePicker · слоты', () => {
	it('trigger-icon подменяет значок кнопки', async () => {
		await render(<DatePicker trigger-icon={<span className="so-test-icon">📅</span>} />)

		expect(trigger().querySelector('.so-test-icon')).not.toBeNull()
	})

	it('item уходит в дни календаря со scope { item }', async () => {
		await render(
			<DatePicker
				item={({ item }: { item: ICalendarItem }) => (
					<span className="so-test-day">«{item.text}»</span>
				)}
			/>,
		)

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('«10»')
	})

	it('item получает и номер дня — scope слота календаря целиком', async () => {
		await render(
			<DatePicker
				item={({ item, text }: { item: ICalendarItem; text: string }) => (
					<span className="so-test-day">{`${text}·${item.date.slice(5)}`}</span>
				)}
			/>,
		)

		expect(dayCell('2026-09-10').querySelector('.so-test-day')?.textContent).toBe('10·09-10')
	})

	it('без слота item день рисует свой номер', async () => {
		await render(<DatePicker />)

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
	const pointer = (eventType: string, target: Element, y: number) =>
		act(() => {
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
		})

	it('без жеста полосы нет; с жестом — первая в панели, немая; календарь — в содержимом', async () => {
		const ctrl = new TDatePicker()

		await render(<DatePicker ctrl={ctrl} />)

		expect(handle()).toBeNull()
		expect(panel().dataset['swiping']).toBe('false')
		expect(node('.so-date-picker__content').parentElement).toBe(panel())
		expect(node('.so-date-picker__calendar').parentElement).toBe(
			node('.so-date-picker__content'),
		)

		act(() => {
			ctrl.swipe = 'handle'
		})
		await nextFrame()

		expect(handle()).toBe(panel().firstElementChild)
		expect(handle()?.getAttribute('aria-hidden')).toBe('true')
	})

	/**
	 * Коробку панели задаёт тест: jsdom раскладку не считает. Сторону после flip
	 * плагин якоря пишет в панель и в jsdom — под полем. Жест мышью по полосе
	 * вниз — дальше четверти высоты панели.
	 */
	it('смахнули вниз от поля — закрыта, колбэк видит закрытие, признак «тянут» на панели', async () => {
		const seen = await bound(undefined, { swipe: 'handle' })

		click(trigger())
		await nextFrame()

		expect(seen.open).toBe(true)
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

		expect(seen.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(panel().dataset['swiping']).toBe('false')
	})
})

/**
 * Своё у React: пересборка под StrictMode и сервер. Без `ctrl` пересобранный
 * DatePicker — новый инстанс с новыми полями, календарём и движком, и поле и
 * календарь, ключённые своими экземплярами, встают над новыми: набор в поле
 * доходит до значения, а выбор дня — до поля. Портала на сервере нет:
 * сервер рисует корень, поле и кнопку календаря, а панель с календарём
 * появляется после гидратации.
 */
describe('DatePicker · React', () => {
	const strict = (element: ReactElement) => <StrictMode>{element}</StrictMode>

	it('StrictMode без ctrl: набор в поле доходит до значения и до календаря', async () => {
		const seen = await bound(undefined, {}, strict)

		focus(node('.so-date-input__segment[data-type="month"]'))
		type('09122026')
		await nextFrame()

		expect(seen.value).toBe('2026-09-12')
		expect(dayCell('2026-09-12').dataset['selected']).toBe('true')
		expect(nodes('.so-date-picker__field')).toHaveLength(1)
		expect(nodes('.so-date-picker__panel')).toHaveLength(1)
	})

	it('StrictMode без ctrl: выбор дня доходит до значения и до поля, панель закрывается', async () => {
		const seen = await bound(undefined, {}, strict)

		click(trigger())
		await nextFrame()

		expect(isOpen()).toBe(true)

		click(dayCell('2026-09-10'))
		await nextFrame()

		expect(seen.value).toBe('2026-09-10')
		expect(seen.open).toBe(false)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])
	})

	it('StrictMode без ctrl, диапазон: дни доходят до полей концов', async () => {
		const seen = await bound(undefined, { mode: 'range' }, strict)

		click(trigger())
		await nextFrame()

		click(dayCell('2026-09-14'))
		click(dayCell('2026-09-10'))
		await nextFrame()

		expect(seen.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(hiddenValues('.so-date-picker')).toEqual(['2026-09-10', '2026-09-14'])
	})

	/**
	 * Сервер и браузер в одном процессе: рендер сервера и гидратация — одна
	 * разметка. `id` частей поля — от `useId`, и у сервера и браузера они одни.
	 * Панели у сервера нет — портал серверный рендер не рисует, — а после
	 * гидратации она в `body`, связанная с кнопкой.
	 */
	it('сервер и гидратация: разметка сходится, id частей те же, панель — после неё', async () => {
		const element = (
			<LocaleProvider locale={ruRU}>
				<DatePicker name="date" value="2026-09-10" />
			</LocaleProvider>
		)
		const container = document.createElement('div')
		const onRecoverableError = vi.fn()

		container.innerHTML = renderToString(element)
		document.body.append(container)

		const ids = () => nodes('.so-date-input__segment').map((part) => part.id)
		const server = ids()
		const serverTrigger = trigger()

		expect(server).toHaveLength(3)
		expect(server.every((id) => id !== '')).toBe(true)
		expect(document.querySelector('.so-date-picker__panel')).toBeNull()
		expect(nodes('.so-date-input__segment[contenteditable]')).toEqual([])

		act(() => {
			track(hydrateRoot(container, element, { onRecoverableError }))
		})
		await nextFrame()

		expect(onRecoverableError).not.toHaveBeenCalled()
		expect(ids()).toEqual(server)
		expect(trigger()).toBe(serverTrigger)
		expect(container.contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(trigger().getAttribute('aria-controls')).toBe(panel().id)
		expect(hiddenValues('.so-date-picker__field')).toEqual(['2026-09-10'])

		// Гидратированный DatePicker работает: панель открывается с календарём
		click(trigger())
		await nextFrame()

		const selected = nodes('.so-date-picker__panel .so-calendar-item[aria-selected="true"]')

		expect(isOpen()).toBe(true)
		expect(selected.map((day) => day.textContent?.trim())).toEqual(['10'])
	})
})
