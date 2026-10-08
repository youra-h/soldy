import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TRANSLATIONS, TDatePicker, isSwipeable } from '@soldy-ui/core'
import type {
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
		expect(target.classes.toArray()).toContain('s-date-picker--single')
		expect(target.dataset.get('open')).toBe('false')
	})

	it('кнопка и панель названы, связка кнопки — диалог', () => {
		const target = picker()

		expect(target.triggerAria.toObject()).toEqual({
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
			'aria-label': 'Choose date',
		})
		expect(target.panelAria.toObject()).toEqual({
			role: 'dialog',
			'aria-modal': 'true',
			'aria-label': 'Choose date',
		})
		expect(target.triggerDataset).toEqual({ 'data-selected': 'false' })
	})

	it('экземпляры — на всю жизнь, движок — календаря', () => {
		const target = picker()

		expect(target.field).toBe(target.field)
		expect(target.engine.options.get('owner')).toBe(target.calendar)
		expect(target.engine.extensions.selection.mode).toBe('single')
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
			weekStart: 1,
			timeZone: 'Asia/Tokyo',
			name: 'date',
		})

		for (const input of [target.field, target.start, target.end]) {
			expect(input.disabled).toBe(true)
			expect(input.readonly).toBe(true)
			expect(input.required).toBe(true)
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

		target.disabled = true
		target.size = 'sm'
		target.locale = 'de-DE'
		target.min = '2026-02-01'
		target.max = '2026-02-28'
		target.readonly = true
		target.required = true
		target.weekStart = 0
		target.timeZone = 'UTC'
		target.name = 'when'

		for (const input of [target.field, target.start, target.end]) {
			expect(input.disabled).toBe(true)
			expect(input.size).toBe('sm')
			expect(input.locale).toBe('de-DE')
			expect(input.min).toBe('2026-02-01')
			expect(input.max).toBe('2026-02-28')
			expect(input.readonly).toBe(true)
			expect(input.required).toBe(true)
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

	it('режим — выбору коллекции календаря и модификатор корня', () => {
		const target = picker()

		target.mode = 'range'

		expect(target.engine.extensions.selection.mode).toBe('range')
		expect(target.classes.toArray()).toContain('s-date-picker--range')
		expect(target.classes.toArray()).not.toContain('s-date-picker--single')
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
		const target = picker()
		const changes = values(target)

		target.engine.extensions.selection.chooseDate('2026-09-12')

		expect(target.value).toBe('2026-09-12')
		expect(target.field.value).toBe('2026-09-12')
		expect(changes).toEqual(['2026-09-12'])
	})

	it('диапазон из календаря: первый день значения не трогает, второй пишет пару в поля', () => {
		const target = picker({ mode: 'range' })
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
		const target = picker({ value: '2026-09-10' })

		target.events.on('change:value:before', (e: TChangeEvent<TDatePickerValue>) =>
			e.preventDefault(),
		)

		target.engine.extensions.selection.chooseDate('2026-09-12')

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
	it('имя кнопки из словаря называет и кнопку, и панель', () => {
		const target = picker()

		expect(target.triggerAria.get('aria-label')).toBe('Choose date')
		expect(target.panelAria.get('aria-label')).toBe('Choose date')

		target.translations = {
			...DEFAULT_TRANSLATIONS,
			datePicker: { ...DEFAULT_TRANSLATIONS.datePicker, trigger: 'Выбрать дату' },
		}

		expect(target.triggerAria.get('aria-label')).toBe('Выбрать дату')
		expect(target.panelAria.get('aria-label')).toBe('Выбрать дату')
	})

	it('набор корня: у диапазона — группа с aria DatePicker, у одной даты — пусто', () => {
		const target = picker({ disabled: true })

		expect(target.rootAria).toEqual({})

		target.mode = 'range'

		expect(target.rootAria).toEqual({ role: 'group', 'aria-disabled': 'true' })
	})

	it('имена концов — выходы DatePicker из словаря', () => {
		const target = picker()

		expect(target.startLabel).toBe('Start date')
		expect(target.endLabel).toBe('End date')

		target.translations = {
			...DEFAULT_TRANSLATIONS,
			datePicker: { ...DEFAULT_TRANSLATIONS.datePicker, start: 'Заезд', end: 'Выезд' },
		}

		expect(target.startLabel).toBe('Заезд')
		expect(target.endLabel).toBe('Выезд')
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
