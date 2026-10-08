import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	DEFAULT_TRANSLATIONS,
	TCalendar,
	TCalendarCollectionFacade,
	createEngineCalendar,
} from '@soldy-ui/core'
import type {
	ICalendarItem,
	ICalendarProps,
	TCalendarGrid,
	TCalendarMode,
	TCalendarValue,
} from '@soldy-ui/core'
import { addDays, compareDates } from '../src/common/calendar'

/**
 * Календарь — владелец коллекции дней: вид кладёт в неё дни показанных
 * месяцев, выбор выбирает даты, фокус ведёт остановку Tab.
 *
 * Команды зовутся так, как их позовёт плагин клавиатуры и указателя: какая
 * клавиша какой команде соответствует, ядро не знает. Расчёт дат сам по себе —
 * `calendar-date.spec.ts`.
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

/** Календарь и его коллекция — так их собирает адаптер. */
function calendar(props: Partial<ICalendarProps> = {}, mode?: TCalendarMode) {
	const owner = new TCalendar(props)
	const collection = new TCalendarCollectionFacade(mode ? { mode } : {}, { owner })
	const { view, selection, focus } = collection.extensions

	return { owner, collection, view, selection, focus }
}

type TCalendarSetup = ReturnType<typeof calendar>

/** День в коллекции по дате. */
function day({ collection }: TCalendarSetup, date: string): ICalendarItem {
	const item = collection.items.find((candidate) => candidate.date === date)

	if (!item) throw new Error(`${date} не в коллекции`)

	return item
}

/** Даты дней коллекции, у которых флаг `data-*` — `"true"`, по возрастанию. */
function flagged({ collection }: TCalendarSetup, name: string): string[] {
	return collection.items
		.filter((item) => item.dataset.get(name) === 'true')
		.map((item) => item.date)
		.sort(compareDates)
}

/** Даты от `from` до `to` включительно. */
function datesFrom(from: string, to: string): string[] {
	const dates: string[] = []

	for (let date = from; compareDates(date, to) <= 0; date = addDays(date, 1)) dates.push(date)

	return dates
}

/** Ключи сеток. */
function keys(grids: TCalendarGrid[]): string[] {
	return grids.map(({ key }) => key)
}

/** Дни недели с воскресенья, как у `Date#getUTCDay()`. */
const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6]

/** Имя дня недели в локали; 2026-09-20 — воскресенье. */
function weekdayName(
	locale: string,
	day: number,
	weekday: 'narrow' | 'short' | 'long' = 'long',
): string {
	return new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' }).format(
		Date.UTC(2026, 8, 20 + day),
	)
}

describe('без аргументов', () => {
	it('владелец: ничего не выбрано, английская локаль, колонки en-US — с воскресенья', () => {
		const owner = new TCalendar()

		expect(owner.value).toBeUndefined()
		expect(owner.locale).toBe('en-US')
		expect(owner.months).toBeUndefined()
		expect(owner.classes.toArray()).toContain('s-calendar')
		expect(owner.weekdays).toHaveLength(7)
		expect(owner.weekdays[0].narrow).toBe(weekdayName('en-US', 0, 'narrow'))
		expect(owner.weekdays[0].long).toBe(weekdayName('en-US', 0))
	})

	it('коллекция: одна сетка на сегодняшнем месяце, в ней дни месяца, фокус — сегодня', () => {
		const setup = calendar()

		expect(setup.collection.mode).toBe('single')
		expect(keys(setup.collection.grids)).toEqual(['2026-09-01'])
		expect(setup.owner.months).toEqual(['2026-09-01'])
		expect(setup.collection.items.map((item) => item.date)).toEqual(
			datesFrom('2026-09-01', '2026-09-30'),
		)
		expect(setup.collection.focusedDate).toBe('2026-09-26')
	})

	it('день — Calendar.Item: корень td, дата и номер в цифрах локали', () => {
		const item = day(calendar(), '2026-09-05')

		expect(item.tag).toBe('td')
		expect(item.classes.toArray()).toContain('s-calendar-item')
		expect(item.text).toBe('5')
		expect(item.aria.get('aria-label')).toBe(
			new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 5),
			),
		)
	})

	it('createEngineCalendar без владельца — движок собран, дней нет: они от календаря', () => {
		const engine = createEngineCalendar()

		expect(engine.extensions.view).toBeDefined()
		expect(engine.extensions.batch.items).toHaveLength(0)
		expect(engine.extensions.view.grids).toEqual([])

		engine.options.set({ owner: new TCalendar({ months: ['2026-09-01'] }) })

		expect(engine.extensions.batch.items).toHaveLength(30)
	})
})

describe('вид: месяцы сеток', () => {
	it('сетки независимы: январь рядом с сентябрём; в коллекции — дни обоих месяцев', () => {
		const setup = calendar({ months: ['2026-01-15', '2026-09-01'] })

		expect(keys(setup.collection.grids)).toEqual(['2026-01-01', '2026-09-01'])
		expect(setup.collection.items).toHaveLength(31 + 30)
		expect(setup.owner.months).toEqual(['2026-01-01', '2026-09-01'])
	})

	it('заполнители соседних месяцев — не элементы: у ячейки нет дня, она скрыта от скринридера', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const [grid] = setup.collection.grids
		const cells = grid.weeks.flat()
		const fillers = cells.filter((cell) => cell.item === undefined)

		// Сентябрь 2026 с воскресенья: 2 дня августа в начале, 3 дня октября в конце
		expect(fillers.map((cell) => cell.date)).toEqual([
			'2026-08-30',
			'2026-08-31',
			'2026-10-01',
			'2026-10-02',
			'2026-10-03',
		])
		expect(fillers.every((cell) => cell.aria['aria-hidden'] === 'true')).toBe(true)
		expect(cells.filter((cell) => cell.item).map((cell) => cell.item?.date)).toEqual(
			datesFrom('2026-09-01', '2026-09-30'),
		)
	})

	it('при двух сетках подряд хвост одной — заполнитель, а день — в своей сетке', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'] })
		const [september, october] = setup.collection.grids
		const inSeptember = september.weeks.flat().find((cell) => cell.date === '2026-10-01')
		const inOctober = october.weeks.flat().find((cell) => cell.date === '2026-10-01')

		expect(inSeptember?.item).toBeUndefined()
		expect(inOctober?.item).toBe(day(setup, '2026-10-01'))
	})

	it('один месяц — одна сетка: повтор отбрасывается', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-09-20', '2026-10-01'] })

		expect(keys(setup.collection.grids)).toEqual(['2026-09-01', '2026-10-01'])
	})

	it('месяцы не заданы — сетка на месяце первой выбранной даты', () => {
		expect(keys(calendar({ value: '2027-03-10' }).collection.grids)).toEqual(['2027-03-01'])
	})

	it('листание сдвигает все сетки; оставшиеся на экране дни — те же экземпляры', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'] })
		const october5 = day(setup, '2026-10-05')

		setup.collection.extensions.view.showNext()

		expect(keys(setup.collection.grids)).toEqual(['2026-10-01', '2026-11-01'])
		expect(setup.owner.months).toEqual(['2026-10-01', '2026-11-01'])
		expect(day(setup, '2026-10-05')).toBe(october5)
		expect(setup.collection.items.some((item) => item.date === '2026-09-05')).toBe(false)
	})

	it('выбор месяца в сетке; месяц уже в другой сетке — сетки меняются местами', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })

		setup.view.showMonth(1, '2026-05-17')
		expect(keys(setup.collection.grids)).toEqual(['2026-01-01', '2026-05-01'])

		setup.view.showMonth(0, '2026-05-01')
		expect(keys(setup.collection.grids)).toEqual(['2026-05-01', '2026-01-01'])
	})

	it('запись months снаружи перестраивает сетки; тот же список — не смена', () => {
		const setup = calendar()
		const changes = vi.fn()

		setup.collection.events.on('change:months', changes)
		setup.owner.months = ['2026-01-01', '2026-02-01']

		expect(keys(setup.collection.grids)).toEqual(['2026-01-01', '2026-02-01'])
		expect(changes).toHaveBeenCalledTimes(1)

		setup.owner.months = ['2026-01-01', '2026-02-01']
		expect(changes).toHaveBeenCalledTimes(1)
	})

	it('сетки — role="grid"; имя от заголовка — из наборов места сетки', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })

		expect(setup.collection.grids.map(({ gridAria }) => gridAria.role)).toEqual([
			'grid',
			'grid',
		])

		// `id` заголовка и ссылку на него ядро не пишет — это плагин связок
		// (`TCalendarIdsPlugin`). Вид раскладывает то, что записано в наборы места
		expect(setup.collection.grids.map(({ titleAria }) => titleAria.id)).toEqual([
			undefined,
			undefined,
		])

		const sets = setup.view.gridSets(1)

		sets.title.add('id', 'title-1')
		sets.grid.add('aria-labelledby', 'title-1')

		const [, second] = setup.collection.grids

		expect(second.titleAria).toEqual({ id: 'title-1', 'aria-live': 'polite' })
		expect(second.gridAria['aria-labelledby']).toBe('title-1')
	})

	it('наборы — у места сетки: листание их не меняет, их смена — change:grids', () => {
		const setup = calendar({ months: ['2026-01-01'] })
		const changes = vi.fn()

		setup.view.events.on('change:grids', changes)
		setup.view.gridSets(0).title.add('id', 'title-0')

		expect(changes).toHaveBeenCalledTimes(1)

		setup.view.showNext()

		expect(setup.collection.grids[0].titleAria.id).toBe('title-0')
	})

	it('заголовок — вежливая живая область: смену месяца скринридер объявляет сам', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })

		expect(setup.collection.grids.map(({ titleAria }) => titleAria['aria-live'])).toEqual([
			'polite',
			'polite',
		])
	})

	it('ячейка — дата, день и набор; у заполнителя ни текста, ни состояний', () => {
		const [grid] = calendar({ months: ['2026-09-01'] }).collection.grids
		const cells = grid.weeks.flat()

		expect(cells.every((cell) => Object.keys(cell).sort().join() === 'aria,date,item')).toBe(
			true,
		)
		expect(cells.find((cell) => cell.date === '2026-09-05')?.item?.text).toBe('5')
	})

	it('aria-multiselectable — в multiple и range', () => {
		const setup = calendar()

		expect(setup.collection.grids[0].gridAria['aria-multiselectable']).toBeNull()

		setup.collection.mode = 'multiple'
		expect(setup.collection.grids[0].gridAria['aria-multiselectable']).toBe('true')

		setup.collection.mode = 'range'
		expect(setup.collection.grids[0].gridAria['aria-multiselectable']).toBe('true')
	})
})

describe('вид у границ', () => {
	it('сетки не выходят за месяцы min и max; листать туда нельзя', () => {
		const setup = calendar({ min: '2026-09-10', max: '2026-10-20', months: ['2026-01-01'] })

		expect(keys(setup.collection.grids)).toEqual(['2026-09-01'])
		expect(setup.collection.prevDisabled).toBe(true)
		expect(setup.collection.nextDisabled).toBe(false)

		setup.view.showNext()
		expect(keys(setup.collection.grids)).toEqual(['2026-10-01'])
		expect(setup.collection.nextDisabled).toBe(true)

		setup.view.showNext()
		expect(keys(setup.collection.grids)).toEqual(['2026-10-01'])
	})

	it('день вне границ выключен: ни фокуса, ни выбора; data-out-of-bounds', () => {
		const setup = calendar({ min: '2026-09-10' })
		const early = day(setup, '2026-09-05')

		expect(early.disabled).toBe(true)
		expect(early.aria.get('aria-disabled')).toBe('true')
		expect(early.aria.get('tabindex')).toBeUndefined()
		expect(early.dataset.get('out-of-bounds')).toBe('true')
		expect(setup.selection.chooseDate('2026-09-05')).toBe(false)
	})

	it('смена min выключает и включает дни; change:disabled — только у тех, чей итог сменился', () => {
		const setup = calendar()
		const early = day(setup, '2026-09-05')
		const late = day(setup, '2026-09-25')
		const earlyChanges = vi.fn()
		const lateChanges = vi.fn()

		early.events.on('change:disabled', earlyChanges)
		late.events.on('change:disabled', lateChanges)

		setup.owner.min = '2026-09-10'
		expect(early.disabled).toBe(true)
		expect(earlyChanges).toHaveBeenCalledWith(true)
		expect(lateChanges).not.toHaveBeenCalled()

		setup.owner.min = undefined
		expect(early.disabled).toBe(false)
	})

	it('выключенный календарь: дни выключены, остановки Tab нет, листать и выбирать нельзя', () => {
		const setup = calendar({ disabled: true })

		expect(setup.collection.items.every((item) => item.disabled)).toBe(true)
		expect(setup.collection.items.some((item) => item.aria.has('tabindex'))).toBe(false)
		expect(setup.collection.prevDisabled).toBe(true)
		expect(setup.selection.chooseDate('2026-09-10')).toBe(false)

		setup.owner.disabled = false
		expect(day(setup, '2026-09-26').aria.get('tabindex')).toBe('0')
	})
})

describe('кнопки листания', () => {
	it('имена по умолчанию английские; набор кнопки — её имя', () => {
		const { owner } = calendar()

		expect(owner.prevAria).toEqual({ 'aria-label': 'Previous month' })
		expect(owner.nextAria).toEqual({ 'aria-label': 'Next month' })
	})

	it('имена — из словаря: новый словарь — событие и новые наборы', () => {
		const { owner } = calendar()
		const changes = vi.fn()

		owner.events.on('change:translations', changes)
		owner.translations = {
			...DEFAULT_TRANSLATIONS,
			calendar: { ...DEFAULT_TRANSLATIONS.calendar, prevMonth: 'Назад', nextMonth: 'Вперёд' },
		}

		expect(changes).toHaveBeenCalledTimes(1)
		expect(owner.prevAria).toEqual({ 'aria-label': 'Назад' })
		expect(owner.nextAria).toEqual({ 'aria-label': 'Вперёд' })
	})

	it('change:paging — на листание', () => {
		const setup = calendar()
		const paging = vi.fn()

		setup.collection.events.on('change:paging', paging)
		setup.view.showNext()

		expect(paging).toHaveBeenCalledTimes(1)
	})

	it('change:paging — на смену границы, даже когда сетки остались на месте', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const paging = vi.fn()

		setup.collection.events.on('change:paging', paging)
		setup.owner.min = '2026-09-10'

		expect(keys(setup.collection.grids)).toEqual(['2026-09-01'])
		expect(setup.collection.prevDisabled).toBe(true)
		expect(paging).toHaveBeenCalledTimes(1)
	})

	it('change:paging — одно, когда граница сдвинула сетки', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const paging = vi.fn()

		setup.collection.events.on('change:paging', paging)
		setup.owner.min = '2026-11-10'

		expect(keys(setup.collection.grids)).toEqual(['2026-11-01'])
		expect(paging).toHaveBeenCalledTimes(1)
	})

	it('change:paging — на выключение календаря: листать нельзя в обе стороны', () => {
		const setup = calendar()
		const paging = vi.fn()

		setup.collection.events.on('change:paging', paging)
		setup.owner.disabled = true

		expect(paging).toHaveBeenCalledTimes(1)
		expect(setup.collection.prevDisabled).toBe(true)
		expect(setup.collection.nextDisabled).toBe(true)

		setup.owner.disabled = false
		expect(paging).toHaveBeenCalledTimes(2)
		expect(setup.collection.nextDisabled).toBe(false)
	})
})

describe('выбор', () => {
	it('single заменяет значение; значение календаря — строка', () => {
		const setup = calendar()

		setup.selection.chooseDate('2026-09-10')
		setup.selection.chooseDate('2026-09-12')

		expect(setup.owner.value).toBe('2026-09-12')
		expect(flagged(setup, 'selected')).toEqual(['2026-09-12'])
		expect(day(setup, '2026-09-12').aria.get('aria-selected')).toBe('true')
		expect(day(setup, '2026-09-10').aria.get('aria-selected')).toBe('false')
	})

	it('multiple переключает дату; значение — даты по возрастанию', () => {
		const setup = calendar({}, 'multiple')

		setup.selection.chooseDate('2026-09-20')
		setup.selection.chooseDate('2026-09-10')
		expect(setup.owner.value).toEqual(['2026-09-10', '2026-09-20'])

		setup.selection.chooseDate('2026-09-20')
		expect(setup.owner.value).toEqual(['2026-09-10'])
	})

	it('range: первый выбор ставит якорь, второй пишет пару — и задом наперёд', () => {
		const setup = calendar({}, 'range')
		const values: TCalendarValue[] = []

		setup.owner.events.on('change:value', ({ newValue }) => values.push(newValue))

		setup.selection.chooseDate('2026-09-20')
		expect(setup.collection.anchor).toBe('2026-09-20')
		expect(values).toEqual([])

		setup.selection.chooseDate('2026-09-12')
		expect(setup.collection.anchor).toBeUndefined()
		expect(setup.owner.value).toEqual(['2026-09-12', '2026-09-20'])
		expect(flagged(setup, 'range-start')).toEqual(['2026-09-12'])
		expect(flagged(setup, 'range-end')).toEqual(['2026-09-20'])
		expect(flagged(setup, 'range-middle')).toEqual(datesFrom('2026-09-13', '2026-09-19'))
	})

	it('выбор — даты, а не элементы: выбранная дата переживает листание', () => {
		const setup = calendar({ value: '2026-09-10' })

		setup.view.showNext()
		expect(setup.owner.value).toBe('2026-09-10')

		setup.view.showPrev()
		expect(flagged(setup, 'selected')).toEqual(['2026-09-10'])
	})

	it('диапазон через непоказанные месяцы: январь — сентябрь, середина не в коллекции', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] }, 'range')

		setup.selection.chooseDate('2026-01-20')
		setup.selection.chooseDate('2026-09-05')

		expect(setup.owner.value).toEqual(['2026-01-20', '2026-09-05'])
		expect(flagged(setup, 'range-middle')).toEqual([
			...datesFrom('2026-01-21', '2026-01-31'),
			...datesFrom('2026-09-01', '2026-09-04'),
		])
	})

	it('предпросмотр: от якоря до дня под указателем, без указателя — до фокуса', () => {
		const setup = calendar({}, 'range')

		setup.selection.chooseDate('2026-09-10')
		setup.selection.notifyHover('2026-09-14')
		expect(flagged(setup, 'preview')).toEqual(datesFrom('2026-09-10', '2026-09-14'))

		setup.selection.notifyHover(undefined)
		setup.focus.shiftFocus('day', 2)
		expect(flagged(setup, 'preview')).toEqual(datesFrom('2026-09-10', '2026-09-12'))
	})

	it('недоступный день получает фокус, но не выбирается; aria-disabled и data-unavailable', () => {
		const setup = calendar({ unavailable: (date) => date === '2026-09-15' })
		const blocked = day(setup, '2026-09-15')

		expect(blocked.unavailable).toBe(true)
		expect(blocked.disabled).toBe(false)
		expect(blocked.aria.get('aria-disabled')).toBe('true')
		expect(blocked.dataset.get('unavailable')).toBe('true')
		expect(setup.selection.chooseDate('2026-09-15')).toBe(false)

		setup.focus.focusDate('2026-09-15')
		expect(blocked.aria.get('tabindex')).toBe('0')
	})

	it('якорь уходит в unavailable вторым аргументом: «не дольше трёх ночей»', () => {
		const setup = calendar(
			{
				unavailable: (date, anchor) =>
					anchor !== undefined && Math.abs(daysBetween(anchor, date)) > 3,
			},
			'range',
		)

		setup.selection.chooseDate('2026-09-10')

		expect(day(setup, '2026-09-13').unavailable).toBe(false)
		expect(day(setup, '2026-09-14').unavailable).toBe(true)
		expect(setup.selection.chooseDate('2026-09-14')).toBe(false)
		expect(setup.selection.chooseDate('2026-09-13')).toBe(true)
		expect(day(setup, '2026-09-14').unavailable).toBe(false)
	})

	it('смена режима пишет значение в форме нового режима и снимает якорь', () => {
		const setup = calendar({ value: ['2026-09-20', '2026-09-10'] }, 'multiple')

		setup.collection.mode = 'single'
		expect(setup.owner.value).toBe('2026-09-10')

		setup.collection.mode = 'range'
		setup.selection.chooseDate('2026-09-12')
		expect(setup.collection.anchor).toBe('2026-09-12')

		setup.collection.mode = 'multiple'
		expect(setup.collection.anchor).toBeUndefined()
	})

	it('choose: выбор пользователя — когда значение и якорь на месте', () => {
		const setup = calendar({}, 'range')
		const chosen: Array<[string, string | undefined, TCalendarValue]> = []

		setup.selection.events.on('choose', (date) =>
			chosen.push([date, setup.collection.anchor, setup.owner.value]),
		)

		setup.selection.chooseDate('2026-09-20')
		setup.selection.chooseDate('2026-09-12')

		expect(chosen).toEqual([
			['2026-09-20', '2026-09-20', undefined],
			['2026-09-12', undefined, ['2026-09-12', '2026-09-20']],
		])
	})

	it('choose не приходит на отказ и на запись value из кода', () => {
		const setup = calendar({ unavailable: (date) => date === '2026-09-15' })
		const chosen = vi.fn()

		setup.collection.events.on('choose', chosen)

		setup.selection.chooseDate('2026-09-15')
		setup.owner.value = '2026-09-10'

		expect(chosen).not.toHaveBeenCalled()
	})

	it('запись value снаружи снимает якорь и переводит фокус на первую дату', () => {
		const setup = calendar({}, 'range')

		setup.selection.chooseDate('2026-09-10')
		setup.owner.value = ['2026-11-03', '2026-11-08']

		expect(setup.collection.anchor).toBeUndefined()
		expect(setup.collection.focusedDate).toBe('2026-11-03')
		expect(keys(setup.collection.grids)).toEqual(['2026-11-01'])
		expect(flagged(setup, 'range-start')).toEqual(['2026-11-03'])
	})
})

describe('фокус', () => {
	it('одна остановка Tab на все сетки — у дня с фокусом; прочие дни — -1', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'] })
		const stops = setup.collection.items.filter((item) => item.aria.get('tabindex') === '0')

		expect(stops.map((item) => item.date)).toEqual(['2026-09-26'])
		expect(day(setup, '2026-10-05').aria.get('tabindex')).toBe('-1')
	})

	it('сдвиг на день, неделю, месяц и год; месяц прижимает число', () => {
		const setup = calendar({ value: '2026-01-31' })

		setup.focus.shiftFocus('month', 1)
		expect(setup.collection.focusedDate).toBe('2026-02-28')

		setup.focus.shiftFocus('week', 1)
		expect(setup.collection.focusedDate).toBe('2026-03-07')

		setup.focus.shiftFocus('year', -1)
		expect(setup.collection.focusedDate).toBe('2025-03-07')
	})

	it('фокус ушёл из показанного месяца — сетки сдвигаются на столько же', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'], value: '2026-01-31' })

		setup.focus.shiftFocus('day', 1)

		expect(setup.collection.focusedDate).toBe('2026-02-01')
		expect(keys(setup.collection.grids)).toEqual(['2026-02-01', '2026-10-01'])
	})

	it('фокус внутри показанных месяцев сетки не двигает', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'] })

		setup.focus.focusDate('2026-10-15')

		expect(keys(setup.collection.grids)).toEqual(['2026-09-01', '2026-10-01'])
	})

	it('сдвиг вывел бы сетку за границы — месяц фокуса встаёт только в его сетку', () => {
		const setup = calendar({
			months: ['2026-01-01', '2026-09-01'],
			max: '2026-09-30',
			value: '2026-01-31',
		})

		setup.focus.shiftFocus('day', 1)

		expect(keys(setup.collection.grids)).toEqual(['2026-02-01', '2026-09-01'])
	})

	it('листание: фокус едет со своей сеткой на месяц', () => {
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'], value: '2026-10-31' })

		setup.view.showNext()

		expect(setup.collection.focusedDate).toBe('2026-11-30')
	})

	it('края недели — от первого дня недели', () => {
		const setup = calendar({ value: '2026-09-16', weekStart: 1 })

		setup.focus.moveFocusToEdge('start')
		expect(setup.collection.focusedDate).toBe('2026-09-14')

		setup.focus.moveFocusToEdge('end')
		expect(setup.collection.focusedDate).toBe('2026-09-20')
	})

	it('за границей — граница', () => {
		const setup = calendar({ min: '2026-09-10', max: '2026-09-20', value: '2026-09-15' })

		setup.focus.shiftFocus('week', 2)
		expect(setup.collection.focusedDate).toBe('2026-09-20')

		setup.focus.focusDate('2025-01-01')
		expect(setup.collection.focusedDate).toBe('2026-09-10')
	})

	it('resetFocus — на выбранную дату, и её месяц показан', () => {
		const setup = calendar({ value: '2026-03-10' })

		setup.focus.focusDate('2026-07-04')
		expect(keys(setup.collection.grids)).toEqual(['2026-07-01'])

		setup.focus.resetFocus()

		expect(setup.collection.focusedDate).toBe('2026-03-10')
		expect(keys(setup.collection.grids)).toEqual(['2026-03-01'])
	})

	it('resetFocus без значения — на сегодня в границах; выключенный — не трогает', () => {
		const setup = calendar({ max: '2026-09-20' })

		setup.focus.focusDate('2026-08-04')
		setup.focus.resetFocus()
		expect(setup.collection.focusedDate).toBe('2026-09-20')

		setup.focus.focusDate('2026-08-04')
		setup.owner.disabled = true
		setup.focus.resetFocus()
		expect(setup.collection.focusedDate).toBe('2026-08-04')
	})

	it('адаптеры дня: selected и focused со своими событиями', () => {
		const setup = calendar()
		const item = day(setup, '2026-09-10')
		const adapters = {
			selection: setup.selection.createItem(item),
			focus: setup.focus.createItem(item),
		}
		const selected = vi.fn()
		const focused = vi.fn()

		adapters.selection.events.on('change:selected', selected)
		adapters.focus.events.on('change:focused', focused)

		adapters.selection.choose()

		expect(adapters.selection.selected).toBe(true)
		expect(adapters.focus.focused).toBe(true)
		expect(selected).toHaveBeenCalled()
		expect(focused).toHaveBeenCalled()
	})
})

describe('локаль и сегодня', () => {
	it('смена locale меняет номера, имена и колонки; состав тот же', () => {
		const setup = calendar()
		const fifth = day(setup, '2026-09-05')

		setup.owner.locale = 'ar-EG'

		expect(day(setup, '2026-09-05')).toBe(fifth)
		expect(fifth.text).toBe(
			new Intl.DateTimeFormat('ar-EG', { day: 'numeric', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 5),
			),
		)
	})

	it('сегодня — aria-current="date" и data-today', () => {
		const setup = calendar()

		expect(day(setup, '2026-09-26').aria.get('aria-current')).toBe('date')
		expect(flagged(setup, 'today')).toEqual(['2026-09-26'])
	})

	/**
	 * Подпись колонки — узкое имя: короткое у `ar-EG` — целое слово, и
	 * колонке его не вместить. Полное имя — рядом, для скринридера.
	 */
	it('подписи колонок — узкие имена локали: у ar-EG короче коротких', () => {
		const owner = new TCalendar({ locale: 'ar-EG', weekStart: 0 })

		expect(owner.weekdays.map(({ narrow }) => narrow)).toEqual(
			WEEK_DAYS.map((index) => weekdayName('ar-EG', index, 'narrow')),
		)
		expect(owner.weekdays.map(({ long }) => long)).toEqual(
			WEEK_DAYS.map((index) => weekdayName('ar-EG', index)),
		)

		for (const index of WEEK_DAYS) {
			expect(owner.weekdays[index].narrow.length).toBeLessThan(
				weekdayName('ar-EG', index, 'short').length,
			)
		}
	})

	it('смена locale и weekStart меняет подписи колонок', () => {
		const owner = new TCalendar({ weekStart: 0 })

		owner.locale = 'ru-RU'
		owner.weekStart = 1

		expect(owner.weekdays.map(({ narrow }) => narrow)).toEqual(
			[1, 2, 3, 4, 5, 6, 0].map((index) => weekdayName('ru-RU', index, 'narrow')),
		)
	})
})

/**
 * Расширения запоминают посчитанное: отметки выбора, каркас сеток, что день
 * знает от вида, «недоступен» по правилу. Здесь — что память не теряет ни одной
 * смены, от которой посчитанное зависит.
 */
describe('запомненное не отстаёт от данных', () => {
	it('листание зовёт unavailable только для новых дней', () => {
		const rule = vi.fn((date: string) => date === '2026-10-13')
		const setup = calendar({ months: ['2026-09-01', '2026-10-01'], unavailable: rule })

		rule.mockClear()
		setup.view.showNext()

		const called = new Set(rule.mock.calls.map(([date]) => date))

		expect([...called].sort(compareDates)).toEqual(datesFrom('2026-11-01', '2026-11-30'))
		expect(day(setup, '2026-10-13').unavailable).toBe(true)
	})

	it('новая функция unavailable доходит до дней, оставшихся на экране', () => {
		const setup = calendar({ unavailable: () => false })
		const tenth = day(setup, '2026-09-10')
		const changes = vi.fn()

		tenth.events.on('change:unavailable', changes)
		setup.owner.unavailable = (date) => date === '2026-09-10'

		expect(tenth.unavailable).toBe(true)
		expect(changes).toHaveBeenCalledWith(true)
	})

	it('отметки идут за записью значения, режимом, якорем, указателем и фокусом', () => {
		const setup = calendar({ value: '2026-09-10' })

		expect(setup.selection.isSelected('2026-09-10')).toBe(true)

		setup.owner.value = '2026-09-11'
		expect(setup.selection.isSelected('2026-09-10')).toBe(false)
		expect(setup.selection.isSelected('2026-09-11')).toBe(true)

		setup.collection.mode = 'range'
		setup.selection.chooseDate('2026-09-05')
		setup.selection.notifyHover('2026-09-07')
		expect(setup.selection.isSelected('2026-09-06')).toBe(true)
		expect(setup.selection.isSelected('2026-09-08')).toBe(false)

		setup.selection.notifyHover(undefined)
		setup.focus.focusDate('2026-09-09')
		expect(setup.selection.isSelected('2026-09-08')).toBe(true)

		setup.selection.cancelRange()
		expect(setup.selection.isSelected('2026-09-08')).toBe(false)
		expect(setup.selection.isSelected('2026-09-11')).toBe(true)
	})

	it('каркас сеток идёт за локалью и первым днём недели', () => {
		const setup = calendar({ locale: 'en-US' })
		const title = setup.collection.grids[0].title

		setup.owner.locale = 'ru-RU'
		expect(setup.collection.grids[0].title).not.toBe(title)
		expect(setup.collection.grids[0].title).toBe(
			new Intl.DateTimeFormat('ru-RU', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC',
			}).format(Date.UTC(2026, 8, 1)),
		)

		// Сентябрь 2026 начинается во вторник
		setup.owner.weekStart = 2
		expect(setup.collection.grids[0].weeks[0][0].date).toBe('2026-09-01')

		setup.owner.weekStart = 0
		expect(setup.collection.grids[0].weeks[0][0].date).toBe('2026-08-30')
	})

	it('имя дня идёт за локалью, «сегодня» — за поясом', () => {
		const setup = calendar()
		const fifth = day(setup, '2026-09-05')

		setup.owner.locale = 'de-DE'
		expect(fifth.aria.get('aria-label')).toBe(
			new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 5),
			),
		)

		// Полдень 26-го по местному времени; в поясе на 14 часов восточнее UTC
		// уже 27-е, если машина не восточнее его самого
		vi.setSystemTime(new Date(Date.UTC(2026, 8, 26, 12)))
		setup.owner.timeZone = 'Pacific/Kiritimati'
		expect(flagged(setup, 'today')).toEqual(['2026-09-27'])
		expect(day(setup, '2026-09-27').aria.get('aria-current')).toBe('date')
		expect(day(setup, '2026-09-26').aria.get('aria-current')).toBeUndefined()
	})

	it('«выключен» идёт за календарём и после листания: новые дни — тоже', () => {
		const setup = calendar()

		setup.owner.disabled = true
		setup.view.showNext()

		expect(setup.collection.items.every((item) => item.disabled)).toBe(true)

		setup.owner.disabled = false
		expect(setup.collection.items.some((item) => item.disabled)).toBe(false)
	})
})

/** Дней от `from` до `to`. */
function daysBetween(from: string, to: string): number {
	return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
}
