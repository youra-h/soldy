import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryObjects } from 'node:v8'
import {
	TCalendarCollectionFacade,
	TCalendarItem,
	TClearable,
	TDateInput,
	TDatePicker,
	TListBox,
	TPopover,
	isSwipeable,
} from '@soldy-ui/core'
import type {
	IDateInput,
	IDatePickerProps,
	TCalendarUnavailable,
	TChangeEvent,
	TDatePickerValue,
} from '@soldy-ui/core'

/**
 * DatePicker — поле даты и календарь в панели. Сам он дат не считает:
 * раздаёт полям и календарю общее, держит одно значение на две стороны и
 * открывает и закрывает панель.
 *
 * Правка поля — так, как её делают плагины поля: вставка значения текстом и
 * очистка части. Выбор дня — команда расширения выбора календаря, как её
 * зовут плагины календаря.
 *
 * Сегодня во всех тестах — суббота 2026-09-26: время подменено полднем по
 * местному времени, и дата не зависит от пояса машины.
 */

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
})

function picker(props: Partial<IDatePickerProps> = {}): TDatePicker {
	return new TDatePicker(props)
}

/** Ночей от `from` до `to` — разность дат в днях. */
function nights(from: string, to: string): number {
	return (Date.parse(to) - Date.parse(from)) / 86_400_000
}

/** Значения DatePicker из `change:value` — по порядку. */
function values(target: TDatePicker): TDatePickerValue[] {
	const list: TDatePickerValue[] = []

	target.events.on('change:value', ({ newValue }) => list.push(newValue))

	return list
}

describe('без аргументов', () => {
	it('одна дата, панель закрыта, значения нет', () => {
		const target = picker()

		expect(target.mode).toBe('single')
		expect(target.open).toBe(false)
		expect(target.closeOnSelect).toBe(true)
		expect(target.value).toBeUndefined()
		expect(target.classes.toArray()).toContain('so-date-picker--single')
		expect(target.dataset.get('open')).toBe('false')
	})

	it('связка кнопки — диалог, панель — модальный диалог; имена пишет плагин имён', () => {
		const target = picker()

		expect(target.triggerAria.toObject()).toEqual({
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
		})
		expect(target.panelAria.toObject()).toEqual({
			role: 'dialog',
			'aria-modal': 'true',
		})
		expect(target.triggerDataset).toEqual({ 'data-selected': 'false' })
	})

	it('экземпляры — на всю жизнь; календаря в движке, пока панель не открывали, нет', () => {
		const target = picker()

		expect(target.field).toBe(target.field)
		expect(target.engine.extensions.selection.mode).toBe('single')
		expect(target.engine.options.get('owner')).toBeUndefined()
	})
})

describe('общее — полям и календарю', () => {
	it('из пропсов конструктора', () => {
		const unavailable = (date: string) => date === '2026-09-15'
		const target = picker({
			disabled: true,
			readonly: true,
			required: true,
			size: 'lg',
			locale: 'ru-RU',
			min: '2026-01-01',
			max: '2026-12-31',
			unavailable,
			validate: true,
			weekStart: 1,
			timeZone: 'Asia/Tokyo',
			name: 'date',
		})

		for (const input of [target.field, target.start, target.end]) {
			expect(input.disabled).toBe(true)
			expect(input.readonly).toBe(true)
			expect(input.required).toBe(true)
			expect(input.validate).toBe(true)
			expect(input.size).toBe('lg')
			expect(input.locale).toBe('ru-RU')
			expect(input.min).toBe('2026-01-01')
			expect(input.max).toBe('2026-12-31')
		}

		expect(target.field.name).toBe('date')
		expect(target.start.name).toBe('')
		expect(target.calendar.disabled).toBe(true)
		expect(target.calendar.size).toBe('lg')
		expect(target.calendar.locale).toBe('ru-RU')
		expect(target.calendar.min).toBe('2026-01-01')
		expect(target.calendar.max).toBe('2026-12-31')
		expect(target.calendar.unavailable).toBe(unavailable)
		expect(target.calendar.weekStart).toBe(1)
		expect(target.calendar.timeZone).toBe('Asia/Tokyo')
	})

	it('смена свойства доходит до всех, кому оно нужно', () => {
		const target = picker()
		// The range ends exist once read: read first, the change has to reach made fields
		const inputs = [target.field, target.start, target.end]

		target.disabled = true
		target.size = 'sm'
		target.locale = 'de-DE'
		target.min = '2026-02-01'
		target.max = '2026-02-28'
		target.readonly = true
		target.required = true
		target.validate = true
		target.weekStart = 0
		target.timeZone = 'UTC'
		target.name = 'when'

		for (const input of inputs) {
			expect(input.disabled).toBe(true)
			expect(input.size).toBe('sm')
			expect(input.locale).toBe('de-DE')
			expect(input.min).toBe('2026-02-01')
			expect(input.max).toBe('2026-02-28')
			expect(input.readonly).toBe(true)
			expect(input.required).toBe(true)
			expect(input.validate).toBe(true)
		}

		expect(target.field.name).toBe('when')
		expect(target.calendar.disabled).toBe(true)
		expect(target.calendar.size).toBe('sm')
		expect(target.calendar.locale).toBe('de-DE')
		expect(target.calendar.min).toBe('2026-02-01')
		expect(target.calendar.max).toBe('2026-02-28')
		expect(target.calendar.weekStart).toBe(0)
		expect(target.calendar.timeZone).toBe('UTC')
	})

	it('validate по умолчанию выключен; change:validate — только на реальное изменение, getProps его отдаёт', () => {
		const target = picker()
		const handler = vi.fn()

		expect(target.validate).toBe(false)
		expect([target.field, target.start, target.end].map((input) => input.validate)).toEqual([
			false,
			false,
			false,
		])

		target.events.on('change:validate', handler)
		target.validate = true
		target.validate = true

		expect(handler.mock.calls).toEqual([[true]])
		expect(target.getProps().validate).toBe(true)
	})

	it('режим — выбору коллекции календаря и модификатор корня', () => {
		const target = picker()

		target.mode = 'range'

		expect(target.engine.extensions.selection.mode).toBe('range')
		expect(target.classes.toArray()).toContain('so-date-picker--range')
		expect(target.classes.toArray()).not.toContain('so-date-picker--single')
	})
})

describe('значение', () => {
	it('своё — календарю как есть и в поле режима', () => {
		const single = picker({ value: '2026-09-10' })

		expect(single.calendar.value).toBe('2026-09-10')
		expect(single.field.value).toBe('2026-09-10')

		const range = picker({ mode: 'range', value: ['2026-09-20', '2026-09-10'] })

		// Пара задом наперёд — как задана: показывает её по возрастанию календарь
		expect(range.calendar.value).toEqual(['2026-09-20', '2026-09-10'])
		expect(range.start.value).toBe('2026-09-20')
		expect(range.end.value).toBe('2026-09-10')
	})

	it('запись снаружи — на обе стороны', () => {
		const target = picker({ mode: 'range' })

		target.value = ['2026-10-01', '2026-10-05']

		expect(target.calendar.value).toEqual(['2026-10-01', '2026-10-05'])
		expect(target.start.value).toBe('2026-10-01')
		expect(target.end.value).toBe('2026-10-05')
	})

	it('выбор дня в календаре — значение и поле', () => {
		const target = picker({ open: true })
		const changes = values(target)

		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.value).toBe('2026-09-12')
		expect(target.field.value).toBe('2026-09-12')
		expect(changes).toEqual(['2026-09-12'])
	})

	it('диапазон из календаря: первый день значения не трогает, второй пишет пару в поля', () => {
		const target = picker({ mode: 'range', open: true })
		const changes = values(target)
		const { selection } = target.engine.extensions

		selection.chooseDate('2026-09-20')

		expect(target.value).toBeUndefined()
		expect(target.start.value).toBeUndefined()

		selection.chooseDate('2026-09-12')

		expect(target.value).toEqual(['2026-09-12', '2026-09-20'])
		expect(target.start.value).toBe('2026-09-12')
		expect(target.end.value).toBe('2026-09-20')
		expect(changes).toEqual([['2026-09-12', '2026-09-20']])
	})

	it('правка поля — значение и календарь', () => {
		const target = picker()

		target.field.paste('2026-09-14')

		expect(target.value).toBe('2026-09-14')
		expect(target.calendar.value).toBe('2026-09-14')
	})

	it('недонабранный конец значения не даёт и набранного не стирает', () => {
		const target = picker({ mode: 'range' })

		target.start.paste('2026-09-01')

		expect(target.value).toBeUndefined()
		expect(target.start.value).toBe('2026-09-01')

		target.end.paste('2026-09-07')

		expect(target.value).toEqual(['2026-09-01', '2026-09-07'])
		expect(target.calendar.value).toEqual(['2026-09-01', '2026-09-07'])

		// Конец разобрали — пары нет, а начало осталось
		target.end.focusSegment('year')
		target.end.clearSegment()

		expect(target.value).toBeUndefined()
		expect(target.calendar.value).toBeUndefined()
		expect(target.start.value).toBe('2026-09-01')
	})

	it('отменённая запись: поле-источник получает обратно принятое', () => {
		const target = picker({ value: '2026-09-10' })

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) =>
			e.preventDefault(),
		)

		target.field.paste('2026-09-14')

		expect(target.value).toBe('2026-09-10')
		expect(target.field.value).toBe('2026-09-10')
		expect(target.calendar.value).toBe('2026-09-10')
	})

	it('поправленная запись: источник и другая сторона получают итог', () => {
		const target = picker()

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) => {
			e.value = '2026-09-01'
		})

		target.field.paste('2026-09-14')

		expect(target.value).toBe('2026-09-01')
		expect(target.field.value).toBe('2026-09-01')
		expect(target.calendar.value).toBe('2026-09-01')
	})

	it('отменённый выбор в календаре: календарь получает обратно принятое', () => {
		const target = picker({ value: '2026-09-10', open: true })

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) =>
			e.preventDefault(),
		)

		expect(target.engine.extensions.selection.chooseDate('2026-09-12')).toBe(true)

		expect(target.value).toBe('2026-09-10')
		expect(target.calendar.value).toBe('2026-09-10')
		expect(target.field.value).toBe('2026-09-10')
	})

	it('смена режима: значение — в форме режима, поля — нового режима', () => {
		const target = picker({ value: '2026-09-10' })

		target.mode = 'range'

		expect(target.value).toEqual(['2026-09-10', '2026-09-10'])
		expect(target.start.value).toBe('2026-09-10')
		expect(target.end.value).toBe('2026-09-10')

		target.value = ['2026-09-12', '2026-09-20']
		target.mode = 'single'

		expect(target.value).toBe('2026-09-12')
		expect(target.field.value).toBe('2026-09-12')
	})

	it('пустое значение раскладывается по полям нового режима', () => {
		const target = picker()

		target.start.paste('2026-09-01')
		target.mode = 'range'

		expect(target.value).toBeUndefined()
		expect(target.start.value).toBeUndefined()
		expect(target.end.value).toBeUndefined()
	})

	it('правка поля чужого режима значения не меняет', () => {
		const target = picker()

		target.start.paste('2026-09-01')

		expect(target.value).toBeUndefined()
	})
})

/**
 * Кнопка очистки — DatePicker как поле (база `TClearable`): признак, набор кнопки и
 * команда `clear`. Кнопка одна на значение, и полям `clearable` не уходит:
 * очищает DatePicker свой режим целиком — у диапазона оба конца, в том числе
 * набранные не до конца, у которых значения нет.
 */
describe('кнопка очистки', () => {
	/** Пусты ли все части поля — в каждой подсказка, а не набранное. */
	const blank = (input: IDateInput): boolean =>
		input.segments.every((segment) => segment.placeholder)

	it('DatePicker — поле: clearable с модификатором, имя кнопки пишет плагин имён', () => {
		const target = picker()

		expect(target).toBeInstanceOf(TClearable)
		expect(target.clearable).toBe(false)
		expect(target.classes.toArray()).not.toContain('so-date-picker--clearable')

		target.clearable = true

		expect(target.classes.toArray()).toContain('so-date-picker--clearable')
		expect(target.getProps().clearable).toBe(true)
		expect(target.clearAria.valueOf()).toEqual({})
	})

	it('полям clearable не уходит: кнопку рисует DatePicker, одну на значение', () => {
		const target = picker({ clearable: true })

		target.clearable = false
		target.clearable = true

		for (const input of [target.field, target.start, target.end]) {
			expect(input.clearable).toBe(false)
		}
	})

	it('одна дата: значение снято с поля и календаря, потом — clear', () => {
		const target = picker({ value: '2026-09-10' })
		const seen: string[] = []

		target.events.on('change:value', ({ newValue }) => seen.push(`change:value ${newValue}`))
		target.events.on('clear', () => seen.push(`clear ${target.calendar.value}`))

		target.clear()

		expect(target.value).toBeUndefined()
		expect(target.field.value).toBeUndefined()
		expect(blank(target.field)).toBe(true)
		expect(seen).toEqual(['change:value undefined', 'clear undefined'])
	})

	it('диапазон: оба конца — одной сменой значения и одним clear', () => {
		const target = picker({ mode: 'range', value: ['2026-09-10', '2026-09-14'] })
		const changes = values(target)
		const clear = vi.fn()

		target.events.on('clear', clear)
		target.clear()

		expect(target.value).toBeUndefined()
		expect(target.calendar.value).toBeUndefined()
		expect([target.start.value, target.end.value]).toEqual([undefined, undefined])
		expect(blank(target.start)).toBe(true)
		expect(blank(target.end)).toBe(true)
		expect(changes).toEqual([undefined])
		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Записью значения недонабранный конец не очистить: значения у него нет, и
	 * `undefined` частей не тронул бы. Пустеет он командой поля.
	 */
	it('диапазон: конец, набранный не до конца, пустеет тоже', () => {
		const target = picker({ mode: 'range' })

		target.start.paste('2026-09-10')
		// en-US: месяц, день, год — набран только месяц
		target.end.focusSegment('month')
		target.end.typeKey('0')
		target.end.typeKey('9')

		expect(target.value).toBeUndefined()
		expect(blank(target.end)).toBe(false)

		target.clear()

		expect(target.start.value).toBeUndefined()
		expect(blank(target.start)).toBe(true)
		expect(blank(target.end)).toBe(true)
	})

	it('у пустого DatePicker clear приходит тоже', () => {
		const target = picker({ mode: 'range' })
		const clear = vi.fn()

		target.events.on('clear', clear)
		target.clear()

		expect(clear).toHaveBeenCalledTimes(1)
	})

	/**
	 * Кнопку только для чтения не гасят — как у полей: `readonly` запрещает
	 * править части и открывать панель, а очистка его не спрашивает.
	 */
	it('только для чтения — очищается', () => {
		const target = picker({
			mode: 'range',
			value: ['2026-09-10', '2026-09-14'],
			readonly: true,
		})

		target.clear()

		expect(target.value).toBeUndefined()
		expect(blank(target.start)).toBe(true)
		expect(blank(target.end)).toBe(true)
	})

	it('отменённая в change:value:before запись — значение и оба конца на месте', () => {
		const target = picker({ mode: 'range', value: ['2026-09-10', '2026-09-14'] })

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) =>
			e.preventDefault(),
		)
		target.clear()

		expect(target.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(target.calendar.value).toEqual(['2026-09-10', '2026-09-14'])
		expect([target.start.value, target.end.value]).toEqual(['2026-09-10', '2026-09-14'])
	})
})

describe('панель', () => {
	it('открытость: события, data-open, связка кнопки и её вид', () => {
		const target = picker()
		const opened = vi.fn()
		const closed = vi.fn()

		target.events.on('open', opened)
		target.events.on('close', closed)

		target.toggleOpen()

		expect(target.open).toBe(true)
		expect(opened).toHaveBeenCalledTimes(1)
		expect(target.dataset.get('open')).toBe('true')
		expect(target.triggerAria.get('aria-expanded')).toBe('true')
		expect(target.triggerDataset).toEqual({ 'data-selected': 'true' })

		target.toggleOpen()

		expect(target.open).toBe(false)
		expect(closed).toHaveBeenCalledTimes(1)
	})

	it('календарь — с первого открытия: закрытие его оставляет, открытая со старта — сразу', () => {
		const target = picker()

		expect(target.contentRendered).toBe(false)

		target.open = true
		expect(target.contentRendered).toBe(true)

		target.open = false
		expect(target.contentRendered).toBe(true)

		expect(picker({ open: true }).contentRendered).toBe(true)
	})

	it('выключенный и только для чтения не открываются; выключение закрывает', () => {
		const target = picker({ disabled: true })

		expect(target.openable).toBe(false)

		target.open = true
		expect(target.open).toBe(false)

		target.disabled = false
		target.readonly = true
		expect(target.openable).toBe(false)

		target.readonly = false
		target.open = true
		target.disabled = true

		expect(target.open).toBe(false)
	})

	it('открытие ставит фокус сетки на выбранную дату и показывает её месяц', () => {
		const target = picker({ value: '2026-03-10' })
		const { focus } = target.engine.extensions

		focus.focusDate('2026-07-04')
		target.open = true

		expect(focus.focusedDate).toBe('2026-03-10')
		expect(target.calendar.months).toEqual(['2026-03-01'])
	})

	it('без значения открытие ставит фокус на сегодня', () => {
		const target = picker()
		const { focus } = target.engine.extensions

		focus.focusDate('2026-07-04')
		target.open = true

		expect(focus.focusedDate).toBe('2026-09-26')
	})

	it('выбор закрывает панель; в диапазоне — второй день', () => {
		const single = picker({ open: true })

		single.engine.extensions.selection.chooseDate('2026-09-12')
		expect(single.open).toBe(false)

		const range = picker({ mode: 'range', open: true })

		range.engine.extensions.selection.chooseDate('2026-09-12')
		expect(range.open).toBe(true)

		range.engine.extensions.selection.chooseDate('2026-09-14')
		expect(range.open).toBe(false)
	})

	it('closeOnSelect: false — выбор панель не закрывает', () => {
		const target = picker({ open: true, closeOnSelect: false })

		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.open).toBe(true)
	})

	it('закрытие посреди диапазона снимает якорь', () => {
		const target = picker({ mode: 'range', open: true })
		const { selection } = target.engine.extensions

		selection.chooseDate('2026-09-12')
		expect(selection.anchor).toBe('2026-09-12')

		target.open = false

		expect(selection.anchor).toBeUndefined()
	})
})

/**
 * The calendar goes into the engine when the picker first gives the
 * collection work — on opening and on a mode change. The days and the month
 * pickers are built for the owner only, so a picker nobody opened holds none;
 * the value and the mode live without it.
 */
describe('календарь в движке — с первого открытия', () => {
	it('не открывали — календаря в движке нет: ни дней, ни сеток, ни панелей выбора месяца', () => {
		const target = picker({ value: '2026-09-10' })
		const { batch, view, picker: places } = target.engine.extensions

		expect(target.engine.options.get('owner')).toBeUndefined()
		expect(batch.items).toHaveLength(0)
		expect(view.grids).toEqual([])
		expect(places.pickers).toEqual([])
		// The value is the calendar's all the same
		expect(target.calendar.value).toBe('2026-09-10')
	})

	it('открыли — календарь владелец движка: сетка месяца значения с днями, фокус на старте', () => {
		const target = picker({ value: '2026-09-10' })
		const { batch, view, focus, picker: places } = target.engine.extensions

		target.open = true

		const chosen = batch.items.find((day) => day.date === '2026-09-10')

		expect(target.engine.options.get('owner')).toBe(target.calendar)
		expect(view.grids.map((grid) => grid.key)).toEqual(['2026-09-01'])
		expect(batch.items).toHaveLength(30)
		expect(chosen?.aria.get('aria-selected')).toBe('true')
		expect(focus.focusedDate).toBe('2026-09-10')
		expect(places.pickers).toHaveLength(1)
	})

	it('закрытие календарь в движке оставляет, повторное открытие наблюдателей не будит', () => {
		const target = picker()
		const owners: unknown[] = []

		target.engine.options.watch('owner', (owner) => owners.push(owner))

		target.open = true
		target.open = false
		target.open = true

		expect(owners).toEqual([undefined, target.calendar])
	})

	/**
	 * A Calendar mounted over the picker's engine releases the owner when it is
	 * unmounted; the next opening gives the calendar back to the engine.
	 */
	it('снятый календарь отпустил движок — следующее открытие возвращает его', () => {
		const target = picker()
		const facade = new TCalendarCollectionFacade(
			{},
			{ engine: target.engine, owner: target.calendar },
		)

		target.open = true
		facade.bindOwner()
		facade.releaseOwner()

		expect(target.engine.options.get('owner')).toBeUndefined()

		target.open = false
		target.open = true

		expect(target.engine.options.get('owner')).toBe(target.calendar)
		expect(target.engine.extensions.batch.items).not.toHaveLength(0)
	})

	it('смена режима до первого открытия — календарь в движке, значение в форме режима', () => {
		const target = picker({ value: '2026-09-10' })

		target.mode = 'range'

		expect(target.engine.options.get('owner')).toBe(target.calendar)
		expect(target.calendar.value).toEqual(['2026-09-10', '2026-09-10'])
		expect(target.value).toEqual(['2026-09-10', '2026-09-10'])
		expect([target.start.value, target.end.value]).toEqual(['2026-09-10', '2026-09-10'])
	})

	it('команды календаря до первого открытия ничего не делают; открыли — выбор доходит до значения', () => {
		const target = picker()
		const { selection } = target.engine.extensions

		expect(selection.chooseDate('2026-09-12')).toBe(false)
		expect(target.value).toBeUndefined()

		target.open = true

		expect(selection.chooseDate('2026-09-12')).toBe(true)
		expect(target.value).toBe('2026-09-12')
	})
})

/**
 * A field is created when its mode needs it — the mode's strategy takes it —
 * or when its getter is read, and it stays for the picker's life. A field made
 * later gets the shared state as it is by then, the end — against the start.
 */
describe('поля — по режиму', () => {
	it('поля режима — с режимом, и живут дальше: вернулся режим — те же экземпляры', () => {
		const target = picker()
		const field = target.field

		target.mode = 'range'

		const { start, end } = target

		target.mode = 'single'
		expect(target.field).toBe(field)

		target.mode = 'range'
		expect(target.start).toBe(start)
		expect(target.end).toBe(end)
	})

	it('позднее поле получает текущее общее: выключен, только чтение, размер, локаль, границы, ошибка, правило, имя', () => {
		const unavailable: TCalendarUnavailable = (date) => date === '2026-09-15'
		const target = picker()

		target.disabled = true
		target.readonly = true
		target.required = true
		target.size = 'lg'
		target.locale = 'ru-RU'
		target.min = '2026-09-01'
		target.max = '2026-09-30'
		target.unavailable = unavailable
		target.validate = true
		target.invalid = true
		target.startName = 'from'
		target.endName = 'to'

		// One date: the range ends are made only now, by the mode
		target.mode = 'range'

		for (const input of [target.start, target.end]) {
			expect(input.disabled).toBe(true)
			expect(input.readonly).toBe(true)
			expect(input.required).toBe(true)
			expect(input.size).toBe('lg')
			expect(input.locale).toBe('ru-RU')
			expect(input.max).toBe('2026-09-30')
			expect(input.validate).toBe(true)
			expect(input.invalid).toBe(true)
		}

		expect(target.start.min).toBe('2026-09-01')
		expect(target.start.unavailable).toBe(unavailable)
		expect(target.start.name).toBe('from')
		expect(target.end.min).toBe('2026-09-01')
		expect(target.end.unavailable?.('2026-09-15', undefined)).toBe(true)
		expect(target.end.name).toBe('to')
	})

	it('конец, созданный после набранного начала, сверяется с ним: min и правило с якорем', () => {
		const rule = vi.fn<TCalendarUnavailable>(
			(date, anchor) => anchor !== undefined && nights(anchor, date) > 3,
		)
		const target = picker({ unavailable: rule })

		// One date: reading the start makes it; typing into it is not the value
		target.start.paste('2026-09-20')
		expect(target.value).toBeUndefined()

		const { end } = target

		expect(end.min).toBe('2026-09-20')

		end.paste('2026-09-25')

		expect(end.invalid).toBe(true)
		expect(rule).toHaveBeenCalledWith('2026-09-25', '2026-09-20')
	})
})

/**
 * What a closed picker holds: `queryObjects` from `node:v8` collects garbage
 * itself and counts live instances of a class (see `item-buses.spec.ts`). The
 * counters are global to the worker, so the spec counts `2N` pickers against
 * `N`: that cancels whatever is created once, with the first instance.
 */
describe('вес закрытого DatePicker', () => {
	const COUNT = 20

	/** Live fields, days, lists and popovers right now. */
	function census() {
		return {
			fields: queryObjects(TDateInput, { format: 'count' }),
			days: queryObjects(TCalendarItem, { format: 'count' }),
			lists: queryObjects(TListBox, { format: 'count' }),
			popovers: queryObjects(TPopover, { format: 'count' }),
		}
	}

	type TCensus = ReturnType<typeof census>

	/** What `count` pickers built by `build` add while they are alive. */
	function added(count: number, build: () => TDatePicker): TCensus {
		const before = census()
		const held = Array.from({ length: count }, build)
		const after = census()

		expect(held).toHaveLength(count)

		return {
			fields: after.fields - before.fields,
			days: after.days - before.days,
			lists: after.lists - before.lists,
			popovers: after.popovers - before.popovers,
		}
	}

	/** The price of `COUNT` pickers: `2N` against `N`. */
	function perCount(build: () => TDatePicker): TCensus {
		const once = added(COUNT, build)
		const twice = added(2 * COUNT, build)

		return {
			fields: twice.fields - once.fields,
			days: twice.days - once.days,
			lists: twice.lists - once.lists,
			popovers: twice.popovers - once.popovers,
		}
	}

	it('одна дата — по полю на копию, ни одного дня, списка и поповера', () => {
		expect(perCount(() => picker({ value: '2026-09-10' }))).toEqual({
			fields: COUNT,
			days: 0,
			lists: 0,
			popovers: 0,
		})
	})

	it('диапазон — по два поля на копию, без поля одной даты и без календаря', () => {
		expect(perCount(() => picker({ mode: 'range' }))).toEqual({
			fields: 2 * COUNT,
			days: 0,
			lists: 0,
			popovers: 0,
		})
	})

	it('открытая — дни месяца и панель выбора месяца появляются', () => {
		const days = perCount(() => picker({ value: '2026-09-10', open: true }))

		expect(days.days).toBe(30 * COUNT)
		expect(days.lists).toBe(COUNT)
		expect(days.popovers).toBe(COUNT)
	})
})

/**
 * Выбор с подтверждением (`confirmable`). Выбор в календаре — черновик, и
 * хранит его сам календарь: значения DatePicker и полей он не меняет, пока не
 * нажали «OK» (`confirm()`), а любое другое закрытие панели возвращает
 * календарю значение DatePicker. Когда правка календаря становится значением,
 * решает политика фиксации — стратегия, которую меняет сеттер `confirmable`.
 */
describe('выбор с подтверждением', () => {
	/** Открытая панель с подтверждением. */
	const confirming = (props: Partial<IDatePickerProps> = {}) =>
		picker({ confirmable: true, open: true, ...props })

	it('по умолчанию выключен: «OK» включена, getProps его отдаёт', () => {
		const target = picker()

		expect(target.confirmable).toBe(false)
		expect(target.confirmDisabled).toBe(false)
		expect(target.getProps().confirmable).toBe(false)
		expect(picker({ confirmable: true }).getProps().confirmable).toBe(true)
	})

	it('confirmable шлёт change:confirmable только на реальное изменение', () => {
		const target = picker()
		const handler = vi.fn()

		target.events.on('change:confirmable', handler)
		target.confirmable = true
		target.confirmable = true

		expect(handler.mock.calls).toEqual([[true]])
	})

	it('выбор — черновик календаря: ни значения, ни поля он не меняет', () => {
		const target = confirming({ value: '2026-09-10' })
		const changes = values(target)

		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.calendar.value).toBe('2026-09-12')
		expect(target.value).toBe('2026-09-10')
		expect(target.field.value).toBe('2026-09-10')
		expect(changes).toEqual([])
	})

	it('выбор панель не закрывает, и closeOnSelect здесь не действует', () => {
		const target = confirming({ closeOnSelect: true })

		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.open).toBe(true)
	})

	it('confirm() — черновик в значение и в поле, панель закрыта', () => {
		const target = confirming({ value: '2026-09-10' })
		const changes = values(target)
		const closed = vi.fn()

		target.events.on('close', closed)
		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.confirm()

		expect(target.value).toBe('2026-09-12')
		expect(target.field.value).toBe('2026-09-12')
		expect(target.calendar.value).toBe('2026-09-12')
		expect(target.open).toBe(false)
		expect(changes).toEqual(['2026-09-12'])
		expect(closed).toHaveBeenCalledTimes(1)
	})

	it('confirm() без правки — значение то же, панель закрыта', () => {
		const target = confirming({ value: '2026-09-10' })
		const changes = values(target)

		target.confirm()

		expect(target.value).toBe('2026-09-10')
		expect(target.open).toBe(false)
		expect(changes).toEqual([])
	})

	it('закрытие сбрасывает черновик: календарь снова показывает значение', () => {
		const target = confirming({ value: '2026-09-10' })
		const changes = values(target)

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.open = false

		expect(target.calendar.value).toBe('2026-09-10')
		expect(target.value).toBe('2026-09-10')
		expect(changes).toEqual([])

		// И открытие начинает с принятого значения, а не с брошенного черновика
		target.open = true

		expect(target.engine.extensions.focus.focusedDate).toBe('2026-09-10')
	})

	it('диапазон: пока стоит якорь, «OK» выключена и confirm() ничего не делает', () => {
		const target = confirming({ mode: 'range', value: ['2026-09-01', '2026-09-03'] })
		const { selection } = target.engine.extensions
		const switches: boolean[] = []

		target.events.on('change:confirmDisabled', (value) => switches.push(value))

		selection.chooseDate('2026-09-20')

		expect(target.confirmDisabled).toBe(true)

		target.confirm()

		expect(target.open).toBe(true)
		expect(target.value).toEqual(['2026-09-01', '2026-09-03'])
		expect(selection.anchor).toBe('2026-09-20')

		selection.chooseDate('2026-09-14')

		expect(target.confirmDisabled).toBe(false)
		expect(target.value).toEqual(['2026-09-01', '2026-09-03'])

		target.confirm()

		expect(target.value).toEqual(['2026-09-14', '2026-09-20'])
		expect(target.start.value).toBe('2026-09-14')
		expect(target.end.value).toBe('2026-09-20')
		expect(target.open).toBe(false)
		expect(switches).toEqual([true, false])
	})

	it('диапазон: снятый якорь включает «OK» снова', () => {
		const target = confirming({ mode: 'range' })
		const { selection } = target.engine.extensions

		selection.chooseDate('2026-09-20')
		selection.cancelRange()

		expect(target.confirmDisabled).toBe(false)
	})

	it('отменённая запись: значение прежнее, календарь получает его обратно, панель закрыта', () => {
		const target = confirming({ value: '2026-09-10' })

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) =>
			e.preventDefault(),
		)

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.confirm()

		expect(target.value).toBe('2026-09-10')
		expect(target.calendar.value).toBe('2026-09-10')
		expect(target.field.value).toBe('2026-09-10')
		expect(target.open).toBe(false)
	})

	it('поправленная запись: календарь и поле получают итог', () => {
		const target = confirming()

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) => {
			e.value = '2026-09-01'
		})

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.confirm()

		expect(target.value).toBe('2026-09-01')
		expect(target.calendar.value).toBe('2026-09-01')
		expect(target.field.value).toBe('2026-09-01')
	})

	it('правка поля — сразу значение, и календарь идёт за ним поверх черновика', () => {
		const target = confirming({ value: '2026-09-10' })

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.field.paste('2026-09-14')

		expect(target.value).toBe('2026-09-14')
		expect(target.calendar.value).toBe('2026-09-14')
	})

	it('смена режима сбрасывает черновик, значение — в форме нового режима', () => {
		const target = confirming({ value: '2026-09-10' })

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.mode = 'range'

		expect(target.value).toEqual(['2026-09-10', '2026-09-10'])
		expect(target.calendar.value).toEqual(['2026-09-10', '2026-09-10'])
		expect(target.start.value).toBe('2026-09-10')
		expect(target.end.value).toBe('2026-09-10')
	})

	it('смена режима без черновика — та же форма, что без подтверждения', () => {
		const target = picker({ confirmable: true, value: '2026-09-10' })

		target.mode = 'range'

		expect(target.value).toEqual(['2026-09-10', '2026-09-10'])

		target.value = ['2026-09-12', '2026-09-20']
		target.mode = 'single'

		expect(target.value).toBe('2026-09-12')
		expect(target.field.value).toBe('2026-09-12')
	})

	it('смена confirmable сбрасывает черновик; дальше выбор — сразу значение', () => {
		const target = confirming({ value: '2026-09-10' })
		const { selection } = target.engine.extensions

		selection.chooseDate('2026-09-12')
		target.confirmable = false

		expect(target.calendar.value).toBe('2026-09-10')
		expect(target.value).toBe('2026-09-10')

		selection.chooseDate('2026-09-15')

		expect(target.value).toBe('2026-09-15')
		expect(target.open).toBe(false)
	})

	it('включили на открытой панели — следующий выбор уже черновик', () => {
		const target = picker({ open: true, value: '2026-09-10' })

		target.confirmable = true
		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.value).toBe('2026-09-10')
		expect(target.open).toBe(true)
	})

	it('выключение закрывает панель и сбрасывает черновик раньше, чем выключится календарь', () => {
		const target = confirming({ value: '2026-09-10' })

		target.engine.extensions.selection.chooseDate('2026-09-12')
		target.disabled = true

		expect(target.open).toBe(false)
		expect(target.calendar.value).toBe('2026-09-10')
	})
})

/**
 * Жест — смахнуть панель, чтобы закрыть. Тянет плагин жеста, как у Select,
 * ядро держит значения: за что тянуть, куда панель уходит и признак «тянут».
 * Панель у поля, и сторону после flip знает только её узел.
 */
describe('жест — смахнуть панель, чтобы закрыть', () => {
	/** Открытый DatePicker: закрытую панель не тянут. */
	const shown = (props: Partial<IDatePickerProps> = {}) => picker({ open: true, ...props })

	it('по умолчанию выключен: полосы нет, сторону решает якорь', () => {
		const target = picker()

		expect(target.swipe).toBe('none')
		expect(target.handleRendered).toBe(false)
		expect(target.swipeSide).toBeNull()
		expect(target.swiping).toBe(false)
	})

	it('смахиваемый слой: контракт жеста узнаётся тип-гардом', () => {
		expect(isSwipeable(picker())).toBe(true)
	})

	it('swipe шлёт change:swipe только на реальное изменение, getProps его отдаёт', () => {
		const target = picker()
		const handler = vi.fn()

		target.events.on('change:swipe', handler)
		target.swipe = 'handle'
		target.swipe = 'handle'

		expect(handler.mock.calls).toEqual([['handle']])
		expect(picker({ swipe: 'panel' }).getProps().swipe).toBe('panel')
	})

	it('полосу рисуют, пока жест включён', () => {
		const target = picker({ swipe: 'panel' })

		expect(target.handleRendered).toBe(true)

		target.swipe = 'none'

		expect(target.handleRendered).toBe(false)
	})

	it('beginSwipe: data-swiping панели и change:swiping, endSwipe — назад', () => {
		const target = shown({ swipe: 'handle' })
		const changes: boolean[] = []

		target.events.on('change:swiping', (value) => changes.push(value))

		expect(target.panelDataset).toEqual({ 'data-swiping': 'false' })
		expect(target.beginSwipe()).toBe(true)
		expect(target.panelDataset).toEqual({ 'data-swiping': 'true' })

		target.endSwipe()

		expect(target.swiping).toBe(false)
		expect(changes).toEqual([true, false])
	})

	// ARIA и `data-*` панели — разные наборы: признак «тянут» не попадает ни в
	// `panelAria`, ни в `dataset` корня, а открытость панели пишет её слой
	it('признак «тянут» — в своём наборе панели, а не в panelAria и не у корня', () => {
		const target = shown({ swipe: 'handle' })

		target.beginSwipe()

		expect(target.panelAria.toObject()).not.toHaveProperty('data-swiping')
		expect(target.dataset.has('swiping')).toBe(false)
		expect(target.panelDataset).not.toHaveProperty('data-open')
		expect(target.panelDataset).not.toBe(target.panelDataset)
	})

	it('без жеста и у закрытой панели жест не начинается', () => {
		expect(shown().beginSwipe()).toBe(false)
		expect(picker({ swipe: 'panel' }).beginSwipe()).toBe(false)
	})

	it('закрытие — и выбором, и только для чтения — и выключенный жест кончают начатый жест', () => {
		const chosen = shown({ swipe: 'panel' })

		chosen.beginSwipe()
		chosen.engine.extensions.selection.chooseDate('2026-09-12')

		expect(chosen.open).toBe(false)
		expect(chosen.swiping).toBe(false)

		const readonly = shown({ swipe: 'panel' })

		readonly.beginSwipe()
		readonly.readonly = true

		expect(readonly.open).toBe(false)
		expect(readonly.swiping).toBe(false)

		const switched = shown({ swipe: 'panel' })

		switched.beginSwipe()
		switched.swipe = 'none'

		expect(switched.swiping).toBe(false)
		expect(switched.panelDataset['data-swiping']).toBe('false')
	})
})

describe('имена и наборы', () => {
	it('имён ядро не строит: имя кнопки и панели пишет плагин имён', () => {
		const target = picker()

		expect(target.triggerAria.has('aria-label')).toBe(false)
		expect(target.panelAria.has('aria-label')).toBe(false)
		expect('startLabel' in target).toBe(false)
		expect('endLabel' in target).toBe(false)
	})

	it('набор корня: у диапазона — группа с aria DatePicker, у одной даты — пусто', () => {
		const target = picker({ disabled: true })

		expect(target.rootAria).toEqual({})

		target.mode = 'range'

		expect(target.rootAria).toEqual({ role: 'group', 'aria-disabled': 'true' })
	})
})

/**
 * Поле помечает ошибкой то, что не даст выбрать календарь, и набранное не
 * прижимает: недоступную дату, а конец диапазона — ещё и раньше начала.
 */
describe('ошибка в поле', () => {
	it('недоступный день: полю одной даты, началу и календарю — правило как есть', () => {
		const unavailable: TCalendarUnavailable = (date) => date === '2026-09-15'
		const target = picker({ unavailable })

		expect(target.field.unavailable).toBe(unavailable)
		expect(target.start.unavailable).toBe(unavailable)
		expect(target.calendar.unavailable).toBe(unavailable)

		target.field.paste('2026-09-15')

		// Значение принято, видна ошибка
		expect(target.value).toBe('2026-09-15')
		expect(target.field.invalid).toBe(true)

		target.field.paste('2026-09-16')

		expect(target.field.invalid).toBe(false)
	})

	it('смена правила доходит до полей и календаря; снятое — ошибки нет', () => {
		const target = picker({ mode: 'range', value: ['2026-09-15', '2026-09-15'] })
		const unavailable: TCalendarUnavailable = (date) => date === '2026-09-15'

		target.unavailable = unavailable

		expect(target.field.unavailable).toBe(unavailable)
		expect(target.calendar.unavailable).toBe(unavailable)
		expect(target.start.invalid).toBe(true)
		expect(target.end.invalid).toBe(true)

		target.unavailable = undefined

		expect(target.start.invalid).toBe(false)
		expect(target.end.unavailable).toBeUndefined()
		expect(target.end.invalid).toBe(false)
	})

	it('конец раньше начала — ошибка поля конца; значение как набрано', () => {
		const target = picker({ mode: 'range' })

		target.start.paste('2026-09-20')
		target.end.paste('2026-09-10')

		expect(target.value).toEqual(['2026-09-20', '2026-09-10'])
		expect(target.end.min).toBe('2026-09-20')
		expect(target.end.invalid).toBe(true)
		expect(target.end.dataset.get('invalid')).toBe('true')
		expect(target.start.invalid).toBe(false)

		// Однодневный период — не ошибка
		target.end.paste('2026-09-20')
		expect(target.end.invalid).toBe(false)

		// Начало сдвинули раньше конца — ошибка снята
		target.end.paste('2026-09-10')
		target.start.paste('2026-09-05')
		expect(target.end.invalid).toBe(false)

		// Начало разобрали — конец сверяется со своими границами
		target.start.paste('2026-09-25')
		expect(target.end.invalid).toBe(true)
		target.start.focusSegment('year')
		target.start.clearSegment()
		expect(target.end.min).toBeUndefined()
		expect(target.end.invalid).toBe(false)
	})

	it('пара задом наперёд снаружи: календарь её упорядочит, поле конца — ошибка', () => {
		const target = picker({ mode: 'range', value: ['2026-09-20', '2026-09-10'] })

		expect(target.end.invalid).toBe(true)
		expect(target.start.invalid).toBe(false)
	})

	it('min конца — начало, пока оно позже min DatePicker', () => {
		const target = picker({ mode: 'range', min: '2026-09-10' })

		target.start.paste('2026-09-05')

		// Начало раньше min — ошибка у него, конец сверяется с min
		expect(target.start.invalid).toBe(true)
		expect(target.end.min).toBe('2026-09-10')

		target.start.paste('2026-09-12')
		expect(target.end.min).toBe('2026-09-12')

		target.min = '2026-09-15'
		expect(target.start.min).toBe('2026-09-15')
		expect(target.end.min).toBe('2026-09-15')

		target.min = undefined
		expect(target.end.min).toBe('2026-09-12')
	})

	it('начало за max конец не поднимает: конец, равный такому началу, — тоже ошибка', () => {
		const target = picker({ mode: 'range', max: '2026-09-30' })

		target.start.paste('2026-10-05')
		target.end.paste('2026-10-05')

		expect(target.start.invalid).toBe(true)
		expect(target.end.min).toBeUndefined()
		expect(target.end.invalid).toBe(true)

		// max сдвинули за начало — начало снова поднимает min конца
		target.max = '2026-10-31'

		expect(target.end.min).toBe('2026-10-05')
		expect(target.start.invalid).toBe(false)
		expect(target.end.invalid).toBe(false)
	})

	it('недоступный конец — с якорем «начало»: «не дольше трёх ночей»', () => {
		const rule = vi.fn<TCalendarUnavailable>(
			(date, anchor) => anchor !== undefined && nights(anchor, date) > 3,
		)
		const target = picker({ mode: 'range', unavailable: rule })

		target.start.paste('2026-09-10')
		target.end.paste('2026-09-14')

		expect(target.value).toEqual(['2026-09-10', '2026-09-14'])
		expect(target.end.invalid).toBe(true)
		// Начало — без якоря, как у поля одной даты
		expect(target.start.invalid).toBe(false)
		expect(rule).toHaveBeenCalledWith('2026-09-14', '2026-09-10')
		expect(rule).toHaveBeenCalledWith('2026-09-10', undefined)

		// Начало сдвинули — правило конца пересобрано с новым якорем
		target.start.paste('2026-09-11')

		expect(target.end.invalid).toBe(false)
	})

	it('к change:value DatePicker конец уже сверен с новым началом', () => {
		const target = picker({ mode: 'range', value: ['2026-09-10', '2026-09-12'] })
		const seen: boolean[] = []

		target.events.on('change:value', () => seen.push(target.end.invalid))

		target.start.paste('2026-09-20')

		expect(target.value).toEqual(['2026-09-20', '2026-09-12'])
		expect(seen).toEqual([true])
	})
})

describe('форма', () => {
	it('имена концов — name полей концов; name — полю одной даты', () => {
		const target = picker({ name: 'date', startName: 'checkIn', endName: 'checkOut' })

		expect(target.field.name).toBe('date')
		expect(target.start.name).toBe('checkIn')
		expect(target.end.name).toBe('checkOut')
	})

	it('смена имён концов — полям концов, с событием', () => {
		const target = picker()
		const changes = vi.fn()

		target.events.on('change:startName', changes)
		target.events.on('change:endName', changes)

		target.startName = 'from'
		target.endName = 'to'

		expect(target.start.name).toBe('from')
		expect(target.end.name).toBe('to')
		expect(target.field.name).toBe('')
		expect(changes).toHaveBeenCalledTimes(2)

		target.startName = 'from'
		expect(changes).toHaveBeenCalledTimes(2)
	})

	it('без имён концов поля концов в форму не уходят', () => {
		const target = picker({ mode: 'range', name: 'date' })

		expect(target.startName).toBe('')
		expect(target.endName).toBe('')
		expect(target.start.name).toBe('')
		expect(target.end.name).toBe('')
	})
})
