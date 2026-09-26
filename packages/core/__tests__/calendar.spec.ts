import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TCalendar } from '@soldy-ui/core'
import type { ICalendarProps, TCalendarDay, TCalendarValue } from '@soldy-ui/core'
import { addDays, compareDates } from '../src/common/calendar'

/**
 * TCalendar — значение по режиму выбора, фокус и вид, выбор пользователя и
 * наборы дней для разметки.
 *
 * Команды здесь зовутся так, как их позовёт плагин клавиатуры и указателя
 * будущего компонента: какая клавиша какой команде соответствует, ядро не
 * знает. Расчёт дат сам по себе — `calendar-date.spec.ts`.
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

const calendar = (props: Partial<ICalendarProps> = {}) => new TCalendar(props)

/** Все дни показанных месяцев, с заполнителями. */
function allDays(instance: TCalendar): TCalendarDay[] {
	return instance.months.flatMap(({ weeks }) => weeks.flat())
}

/** Дни показанных месяцев без заполнителей соседних месяцев. */
function daysOf(instance: TCalendar): TCalendarDay[] {
	return allDays(instance).filter((day) => day.dataset['data-outside-month'] === 'false')
}

/** День месяца по дате. */
function dayOf(instance: TCalendar, date: string): TCalendarDay {
	const day = daysOf(instance).find((item) => item.date === date)

	if (!day) throw new Error(`${date} не показан`)

	return day
}

/** Даты дней месяца, у которых флаг набора `data-*` — `"true"`. */
function flagged(instance: TCalendar, name: string): string[] {
	return daysOf(instance)
		.filter((day) => day.dataset[name] === 'true')
		.map((day) => day.date)
}

/** Даты от `from` до `to` включительно. */
function datesFrom(from: string, to: string): string[] {
	const dates: string[] = []

	for (let date = from; compareDates(date, to) <= 0; date = addDays(date, 1)) dates.push(date)

	return dates
}

/** Смены значения, вида, фокуса, якоря и указателя — в порядке прихода. */
function record(instance: TCalendar) {
	const events: string[] = []
	const values: TCalendarValue[] = []

	instance.events.on('change:value', ({ newValue }) => {
		values.push(newValue)
		events.push('value')
	})
	instance.events.on('change:month', (month) => events.push(`month ${month}`))
	instance.events.on('change:focusedDate', (date) => events.push(`focus ${date}`))
	instance.events.on('change:anchor', (anchor) => events.push(`anchor ${anchor}`))
	instance.events.on('change:hoveredDate', (date) => events.push(`hover ${date}`))

	return { events, values }
}

/** Имя дня недели в локали; 2026-09-20 — воскресенье. */
function weekdayName(locale: string, day: number): string {
	return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
		Date.UTC(2026, 8, 20 + day),
	)
}

describe('без аргументов', () => {
	it('одна дата, английская локаль, фокус и вид — сегодня', () => {
		const instance = new TCalendar()

		expect(instance.value).toBeUndefined()
		expect(instance.mode).toBe('single')
		expect(instance.locale).toBe('en-US')
		expect(instance.numberOfMonths).toBe(1)
		expect(instance.focusedDate).toBe('2026-09-26')
		expect(instance.month).toBe('2026-09-01')
		expect(instance.months.map(({ key }) => key)).toEqual(['2026-09-01'])
		expect(instance.anchor).toBeUndefined()
		expect(instance.hoveredDate).toBeUndefined()
	})

	it('корень — div с классом блока; колонки en-US — с воскресенья', () => {
		const instance = new TCalendar()

		expect(instance.tag).toBe('div')
		expect(instance.classes.toArray()).toContain('s-calendar')
		expect(instance.weekdays).toHaveLength(7)
		expect(instance.weekdays[0].long).toBe(weekdayName('en-US', 0))
	})
})

describe('итог значения — по режиму', () => {
	it('single — дата; невалидная строка выпадает; из массива — самая ранняя', () => {
		expect(calendar({ value: '2026-09-10' }).value).toBe('2026-09-10')
		expect(calendar({ value: '2026-02-30' }).value).toBeUndefined()
		expect(calendar({ value: ['2026-09-20', '2026-09-10'] }).value).toBe('2026-09-10')
	})

	it('multiple — даты по возрастанию без повторов', () => {
		expect(
			calendar({
				mode: 'multiple',
				value: ['2026-09-20', 'мусор', '2026-09-10', '2026-09-20'],
			}).value,
		).toEqual(['2026-09-10', '2026-09-20'])
		expect(calendar({ mode: 'multiple', value: '2026-09-26' }).value).toEqual(['2026-09-26'])
		expect(calendar({ mode: 'multiple' }).value).toEqual([])
	})

	it('range — пара по возрастанию; одна дата — однодневный диапазон', () => {
		expect(calendar({ mode: 'range', value: ['2026-09-20', '2026-09-10'] }).value).toEqual([
			'2026-09-10',
			'2026-09-20',
		])
		expect(calendar({ mode: 'range', value: '2026-09-26' }).value).toEqual([
			'2026-09-26',
			'2026-09-26',
		])
		expect(
			calendar({ mode: 'range', value: ['2026-09-20', '2026-09-01', '2026-09-10'] }).value,
		).toEqual(['2026-09-01', '2026-09-20'])
		expect(calendar({ mode: 'range' }).value).toBeUndefined()
	})

	it('недоступные дни и дни вне границ остаются в значении — это данные потребителя', () => {
		const instance = calendar({
			mode: 'multiple',
			value: ['2026-08-31', '2026-09-15'],
			min: '2026-09-01',
			unavailable: (date) => date === '2026-09-15',
		})

		expect(instance.value).toEqual(['2026-08-31', '2026-09-15'])
	})

	it('смена режима туда и обратно пересчитывает итог, заданное не трогает', () => {
		const given = ['2026-09-20', '2026-09-10', '2026-09-15']
		const instance = calendar({ mode: 'multiple', value: given })
		const { values } = record(instance)

		instance.mode = 'single'
		expect(instance.value).toBe('2026-09-10')

		instance.mode = 'range'
		expect(instance.value).toEqual(['2026-09-10', '2026-09-20'])

		instance.mode = 'multiple'
		expect(instance.value).toEqual(['2026-09-10', '2026-09-15', '2026-09-20'])

		expect(values).toEqual([
			'2026-09-10',
			['2026-09-10', '2026-09-20'],
			['2026-09-10', '2026-09-15', '2026-09-20'],
		])
		expect(instance.states.value.rawValue).toBe(given)
	})

	it('смена режима, не сменившая итог, change:value не шлёт', () => {
		const instance = calendar({ mode: 'range', value: ['2026-09-10', '2026-09-20'] })
		const { values } = record(instance)

		instance.mode = 'multiple'

		expect(instance.value).toEqual(['2026-09-10', '2026-09-20'])
		expect(values).toEqual([])
	})
})

describe('выбор', () => {
	it('single заменяет значение; та же дата — не смена', () => {
		const instance = calendar()
		const { values } = record(instance)

		expect(instance.chooseDate('2026-09-10')).toBe(true)
		expect(instance.chooseDate('2026-09-12')).toBe(true)
		expect(instance.chooseDate('2026-09-12')).toBe(true)

		expect(instance.value).toBe('2026-09-12')
		expect(values).toEqual(['2026-09-10', '2026-09-12'])
	})

	it('multiple переключает дату', () => {
		const instance = calendar({ mode: 'multiple' })

		instance.chooseDate('2026-09-10')
		instance.chooseDate('2026-09-05')
		expect(instance.value).toEqual(['2026-09-05', '2026-09-10'])

		instance.chooseDate('2026-09-10')
		expect(instance.value).toEqual(['2026-09-05'])
	})

	it('range: первый выбор ставит якорь, второй пишет пару — и задом наперёд', () => {
		const instance = calendar({ mode: 'range' })
		const { events } = record(instance)

		instance.chooseDate('2026-09-20')

		expect(instance.anchor).toBe('2026-09-20')
		expect(instance.value).toBeUndefined()

		instance.chooseDate('2026-09-10')

		expect(instance.value).toEqual(['2026-09-10', '2026-09-20'])
		expect(instance.anchor).toBeUndefined()
		// Значение — последним: к change:value якорь снят и фокус на выбранной дате
		expect(events).toEqual([
			'anchor 2026-09-20',
			'focus 2026-09-20',
			'anchor undefined',
			'focus 2026-09-10',
			'value',
		])
	})

	it('range: одна дата дважды — однодневный диапазон', () => {
		const instance = calendar({ mode: 'range' })

		instance.chooseDate('2026-09-12')
		instance.chooseDate('2026-09-12')

		expect(instance.value).toEqual(['2026-09-12', '2026-09-12'])
	})

	it('не дата не выбирается', () => {
		const instance = calendar()

		expect(instance.chooseDate('2026-02-30')).toBe(false)
		expect(instance.value).toBeUndefined()
	})
})

describe('предпросмотр диапазона', () => {
	it('пока стоит якорь, сетка показывает от якоря до дня под указателем, а без указателя — до фокуса', () => {
		const instance = calendar({ mode: 'range', value: ['2026-09-01', '2026-09-03'] })

		expect(flagged(instance, 'data-selected')).toEqual(datesFrom('2026-09-01', '2026-09-03'))
		expect(flagged(instance, 'data-preview')).toEqual([])

		instance.chooseDate('2026-09-10')
		instance.notifyHover('2026-09-14')

		// Вместо значения — предпросмотр
		expect(flagged(instance, 'data-selected')).toEqual(datesFrom('2026-09-10', '2026-09-14'))
		expect(flagged(instance, 'data-preview')).toEqual(datesFrom('2026-09-10', '2026-09-14'))
		expect(flagged(instance, 'data-range-start')).toEqual(['2026-09-10'])
		expect(flagged(instance, 'data-range-end')).toEqual(['2026-09-14'])
		expect(flagged(instance, 'data-range-middle')).toEqual(
			datesFrom('2026-09-11', '2026-09-13'),
		)
		expect(dayOf(instance, '2026-09-12').aria['aria-selected']).toBe('true')

		// Указатель ушёл — до фокуса; после выбора фокус на якоре
		instance.notifyHover(undefined)
		instance.shiftFocus('day', -3)

		expect(flagged(instance, 'data-selected')).toEqual(datesFrom('2026-09-07', '2026-09-10'))
		expect(flagged(instance, 'data-range-start')).toEqual(['2026-09-07'])
		expect(flagged(instance, 'data-range-end')).toEqual(['2026-09-10'])
	})

	it('день под указателем — внутреннее состояние со своим событием', () => {
		const instance = calendar()
		const { events } = record(instance)

		instance.notifyHover('2026-09-14')
		instance.notifyHover('2026-09-14')
		instance.notifyHover('мусор')

		expect(instance.hoveredDate).toBeUndefined()
		expect(events).toEqual(['hover 2026-09-14', 'hover undefined'])
	})

	it('якорь снимают cancelRange, смена режима и смена значения', () => {
		const instance = calendar({ mode: 'range', value: ['2026-09-01', '2026-09-03'] })

		instance.chooseDate('2026-09-10')
		instance.cancelRange()

		expect(instance.anchor).toBeUndefined()
		expect(flagged(instance, 'data-selected')).toEqual(datesFrom('2026-09-01', '2026-09-03'))

		instance.chooseDate('2026-09-10')
		instance.mode = 'multiple'
		expect(instance.anchor).toBeUndefined()

		instance.mode = 'range'
		instance.chooseDate('2026-09-10')
		// Тот же итог — не смена: начатый диапазон остаётся
		instance.value = ['2026-09-03', '2026-09-01']
		expect(instance.anchor).toBe('2026-09-10')

		instance.value = ['2026-09-20', '2026-09-22']
		expect(instance.anchor).toBeUndefined()
	})

	it('якорь уходит в unavailable вторым аргументом: «не дольше трёх ночей»', () => {
		const instance = calendar({
			mode: 'range',
			unavailable: (date, anchor) =>
				anchor !== undefined && compareDates(date, addDays(anchor, 3)) > 0,
		})

		instance.chooseDate('2026-09-10')

		expect(dayOf(instance, '2026-09-14').dataset['data-unavailable']).toBe('true')
		expect(dayOf(instance, '2026-09-13').dataset['data-unavailable']).toBe('false')
		expect(instance.chooseDate('2026-09-14')).toBe(false)
		expect(instance.chooseDate('2026-09-13')).toBe(true)
		expect(instance.value).toEqual(['2026-09-10', '2026-09-13'])

		// Якоря нет — дни снова доступны
		expect(dayOf(instance, '2026-09-20').dataset['data-unavailable']).toBe('false')
	})
})

describe('недоступные дни и дни вне границ', () => {
	it('недоступный день получает фокус, но не выбирается', () => {
		const instance = calendar({ unavailable: (date) => date === '2026-09-15' })

		expect(instance.chooseDate('2026-09-15')).toBe(false)
		expect(instance.value).toBeUndefined()

		instance.focusDate('2026-09-15')

		const day = dayOf(instance, '2026-09-15')

		expect(instance.focusedDate).toBe('2026-09-15')
		expect(day.aria.tabindex).toBe('0')
		expect(day.aria['aria-disabled']).toBe('true')
		expect(day.dataset['data-unavailable']).toBe('true')
	})

	it('день вне границ — ни фокуса, ни выбора', () => {
		const instance = calendar({ min: '2026-09-10', max: '2026-09-20', value: '2026-09-15' })

		expect(instance.chooseDate('2026-09-05')).toBe(false)
		expect(instance.value).toBe('2026-09-15')

		instance.focusDate('2026-09-05')
		expect(instance.focusedDate).toBe('2026-09-10')

		instance.focusDate('2026-09-25')
		expect(instance.focusedDate).toBe('2026-09-20')

		const day = dayOf(instance, '2026-09-05')

		expect(day.aria.tabindex).toBeNull()
		expect(day.aria['aria-disabled']).toBe('true')
		expect(day.dataset['data-out-of-bounds']).toBe('true')
		expect(day.dataset['data-unavailable']).toBe('false')
	})

	it('диапазон проходит через недоступный день', () => {
		const instance = calendar({ mode: 'range', unavailable: (date) => date === '2026-09-15' })

		instance.chooseDate('2026-09-10')
		instance.chooseDate('2026-09-20')

		expect(instance.value).toEqual(['2026-09-10', '2026-09-20'])
		expect(dayOf(instance, '2026-09-15').dataset['data-range-middle']).toBe('true')
	})
})

describe('фокус после записи значения и выбора', () => {
	it('запись value — фокус на первой дате итога, вид за ним', () => {
		const instance = calendar({ mode: 'multiple' })

		instance.value = ['2026-11-05', '2026-10-02']

		expect(instance.focusedDate).toBe('2026-10-02')
		expect(instance.month).toBe('2026-10-01')
	})

	it('тот же итог и пустое значение фокус не трогают', () => {
		const instance = calendar({ mode: 'multiple', value: ['2026-09-10'] })

		instance.focusDate('2026-09-20')
		instance.value = ['2026-09-10']
		expect(instance.focusedDate).toBe('2026-09-20')

		instance.value = []
		expect(instance.focusedDate).toBe('2026-09-20')
	})

	it('после chooseDate в multiple фокус — на выбранной дате, а не на первой', () => {
		const instance = calendar({ mode: 'multiple', value: ['2026-09-01'] })
		const { events } = record(instance)

		instance.chooseDate('2026-09-20')

		expect(instance.value).toEqual(['2026-09-01', '2026-09-20'])
		expect(instance.focusedDate).toBe('2026-09-20')
		// Без захода на первую дату
		expect(events).toEqual(['focus 2026-09-20', 'value'])
	})

	it('при сборке фокус — на первой дате значения; вне границ — на границе', () => {
		expect(calendar({ mode: 'range', value: ['2026-12-20', '2026-11-03'] }).focusedDate).toBe(
			'2026-11-03',
		)
		expect(calendar({ value: '2027-02-14' }).month).toBe('2027-02-01')
		expect(calendar({ value: '2026-08-01', min: '2026-09-10' }).focusedDate).toBe('2026-09-10')
	})
})

describe('ходьба фокуса', () => {
	it('сдвиг на день, неделю, месяц и год; месяц прижимает число', () => {
		const instance = calendar({ value: '2026-01-31' })

		instance.shiftFocus('month', 1)
		expect(instance.focusedDate).toBe('2026-02-28')

		instance.shiftFocus('week', 1)
		expect(instance.focusedDate).toBe('2026-03-07')

		instance.shiftFocus('day', -7)
		expect(instance.focusedDate).toBe('2026-02-28')

		instance.shiftFocus('year', -2)
		expect(instance.focusedDate).toBe('2024-02-28')
	})

	it('за границей — граница', () => {
		const instance = calendar({ min: '2026-09-05', max: '2026-09-25', value: '2026-09-06' })

		instance.shiftFocus('week', -1)
		expect(instance.focusedDate).toBe('2026-09-05')

		instance.shiftFocus('year', 1)
		expect(instance.focusedDate).toBe('2026-09-25')
	})

	it('недоступные дни ходьба не пропускает', () => {
		const instance = calendar({
			value: '2026-09-26',
			unavailable: (date) => date === '2026-09-27',
		})

		instance.shiftFocus('day', 1)

		expect(instance.focusedDate).toBe('2026-09-27')
	})

	it('края недели при weekStart 0 и 1', () => {
		// 2026-09-23 — среда
		const sunday = calendar({ value: '2026-09-23', weekStart: 0 })

		sunday.moveFocusToEdge('start')
		expect(sunday.focusedDate).toBe('2026-09-20')
		sunday.moveFocusToEdge('end')
		expect(sunday.focusedDate).toBe('2026-09-26')

		const monday = calendar({ value: '2026-09-23', weekStart: 1 })

		monday.moveFocusToEdge('start')
		expect(monday.focusedDate).toBe('2026-09-21')
		monday.moveFocusToEdge('end')
		expect(monday.focusedDate).toBe('2026-09-27')
	})

	it('край недели в соседнем месяце уводит вид; за границей — граница', () => {
		// 2026-10-01 — четверг
		const instance = calendar({ value: '2026-10-01', weekStart: 1 })

		instance.moveFocusToEdge('start')

		expect(instance.focusedDate).toBe('2026-09-28')
		expect(instance.month).toBe('2026-09-01')

		const bounded = calendar({ value: '2026-10-01', weekStart: 1, min: '2026-09-30' })

		bounded.moveFocusToEdge('start')

		expect(bounded.focusedDate).toBe('2026-09-30')
	})
})

describe('вид за фокусом', () => {
	it('один месяц: фокус ушёл за конец месяца — вид на следующий', () => {
		const instance = calendar({ value: '2026-09-30' })
		const { events } = record(instance)

		instance.shiftFocus('day', 1)

		expect(instance.month).toBe('2026-10-01')
		expect(events).toEqual(['month 2026-10-01', 'focus 2026-10-01'])
	})

	it('три месяца: вид сдвигается на минимум', () => {
		const instance = calendar({ value: '2026-09-15', numberOfMonths: 3 })
		const keys = () => instance.months.map(({ key }) => key)

		expect(keys()).toEqual(['2026-09-01', '2026-10-01', '2026-11-01'])

		instance.focusDate('2026-11-30')
		expect(keys()).toEqual(['2026-09-01', '2026-10-01', '2026-11-01'])

		instance.shiftFocus('day', 1)
		expect(keys()).toEqual(['2026-10-01', '2026-11-01', '2026-12-01'])

		instance.focusDate('2026-09-30')
		expect(keys()).toEqual(['2026-09-01', '2026-10-01', '2026-11-01'])
	})

	it('листание сдвигает вид и фокус на месяц; число прижимается к длине месяца', () => {
		const instance = calendar({ value: '2026-09-15', numberOfMonths: 3 })

		instance.focusDate('2026-11-05')
		instance.showNext()

		expect(instance.month).toBe('2026-10-01')
		expect(instance.focusedDate).toBe('2026-12-05')

		instance.showPrev()
		instance.showPrev()

		expect(instance.month).toBe('2026-08-01')
		expect(instance.focusedDate).toBe('2026-10-05')

		const short = calendar({ value: '2026-01-31' })

		short.showNext()

		expect(short.focusedDate).toBe('2026-02-28')
	})

	it('запись month сдвигает вид и фокус; другое число того же месяца событий не шлёт', () => {
		const instance = calendar({ value: '2026-09-26' })

		instance.month = '2027-01-15'

		expect(instance.month).toBe('2027-01-01')
		expect(instance.focusedDate).toBe('2027-01-26')

		const { events } = record(instance)

		instance.month = '2027-01-20'
		instance.month = instance.month

		expect(events).toEqual([])
	})

	it('month при сборке — как при записи', () => {
		const instance = calendar({ value: '2026-09-26', month: '2027-01-01' })

		expect(instance.month).toBe('2027-01-01')
		expect(instance.focusedDate).toBe('2027-01-26')
		expect(instance.value).toBe('2026-09-26')
	})

	it('month = undefined — первым показан месяц фокуса', () => {
		const instance = calendar({ value: '2026-09-15', numberOfMonths: 3 })

		instance.focusDate('2026-11-05')
		instance.month = undefined

		expect(instance.month).toBe('2026-11-01')
		expect(instance.focusedDate).toBe('2026-11-05')
	})
})

describe('листание у границ', () => {
	it('вид не раньше месяца min и не позже месяца max', () => {
		const instance = calendar({ value: '2026-09-15', min: '2026-09-10', max: '2026-11-20' })

		expect(instance.prevDisabled).toBe(true)
		expect(instance.nextDisabled).toBe(false)

		instance.showPrev()
		expect(instance.month).toBe('2026-09-01')

		instance.showNext()
		instance.showNext()

		expect(instance.month).toBe('2026-11-01')
		expect(instance.focusedDate).toBe('2026-11-15')
		expect(instance.nextDisabled).toBe(true)

		instance.showNext()
		expect(instance.month).toBe('2026-11-01')
	})

	it('фокус после листания прижимается к границе', () => {
		const instance = calendar({ value: '2026-09-20', max: '2026-10-10' })

		instance.showNext()

		expect(instance.focusedDate).toBe('2026-10-10')
	})

	it('несколько месяцев: блок кончается на месяце max', () => {
		const instance = calendar({
			value: '2026-09-15',
			min: '2026-09-10',
			max: '2026-12-20',
			numberOfMonths: 3,
		})

		instance.showNext()
		instance.showNext()

		expect(instance.months.map(({ key }) => key)).toEqual([
			'2026-10-01',
			'2026-11-01',
			'2026-12-01',
		])
		expect(instance.nextDisabled).toBe(true)

		instance.month = '2027-05-01'
		expect(instance.month).toBe('2026-10-01')
	})

	it('блок не помещается между границами — держится месяц min', () => {
		const instance = calendar({
			value: '2026-10-01',
			min: '2026-09-10',
			max: '2026-10-05',
			numberOfMonths: 3,
		})

		expect(instance.month).toBe('2026-09-01')
		expect(instance.prevDisabled).toBe(true)
		expect(instance.nextDisabled).toBe(true)
	})

	it('выключенный календарь листать нельзя, и команды он игнорирует', () => {
		const instance = calendar({ value: '2026-09-15', mode: 'range', disabled: true })
		const { events } = record(instance)

		expect(instance.prevDisabled).toBe(true)
		expect(instance.nextDisabled).toBe(true)

		instance.showNext()
		instance.showPrev()
		instance.shiftFocus('day', 1)
		instance.focusDate('2026-09-01')
		instance.moveFocusToEdge('end')
		instance.cancelRange()

		expect(instance.chooseDate('2026-09-20')).toBe(false)
		expect(events).toEqual([])
	})
})

describe('смена границ и числа месяцев', () => {
	it('смена min прижимает фокус и вид, значение не трогает', () => {
		const instance = calendar({ value: '2026-09-26' })

		instance.min = '2026-10-05'

		expect(instance.focusedDate).toBe('2026-10-05')
		expect(instance.month).toBe('2026-10-01')
		expect(instance.value).toBe('2026-09-26')
	})

	it('граница не датой — как не задана', () => {
		const instance = calendar({ min: '2026-02-30', max: 'мусор' })

		expect(instance.focusedDate).toBe('2026-09-26')
		expect(instance.prevDisabled).toBe(false)
		expect(instance.nextDisabled).toBe(false)
		expect(instance.chooseDate('1900-01-01')).toBe(true)
	})

	it('max раньше min — граница схлопывается в min', () => {
		const instance = calendar({ value: '2026-09-26', min: '2026-09-20', max: '2026-09-10' })

		expect(instance.focusedDate).toBe('2026-09-20')
		expect(instance.chooseDate('2026-09-20')).toBe(true)
		expect(instance.chooseDate('2026-09-21')).toBe(false)
	})

	it('меньше месяцев — вид идёт за фокусом', () => {
		const instance = calendar({ value: '2026-09-15', numberOfMonths: 3 })

		instance.focusDate('2026-11-05')
		instance.numberOfMonths = 1

		expect(instance.month).toBe('2026-11-01')
		expect(instance.focusedDate).toBe('2026-11-05')
	})

	it('больше месяцев у max — вид отступает, чтобы блок кончился на месяце max', () => {
		const instance = calendar({ value: '2026-12-10', max: '2026-12-31' })

		instance.numberOfMonths = 2

		expect(instance.months.map(({ key }) => key)).toEqual(['2026-11-01', '2026-12-01'])
	})

	it('число месяцев не целое и меньше единицы — один месяц', () => {
		expect(calendar({ numberOfMonths: 0 }).months).toHaveLength(1)
		expect(calendar({ numberOfMonths: Number.NaN }).months).toHaveLength(1)
		expect(calendar({ numberOfMonths: 2.7 }).months).toHaveLength(2)
	})
})

describe('локаль и первый день недели', () => {
	it('смена locale без weekStart меняет колонки', () => {
		const instance = calendar({ value: '2026-09-15' })

		// 2026-09-01 — вторник
		expect(instance.weekdays[0].long).toBe(weekdayName('en-US', 0))
		expect(instance.months[0].weeks[0][0].date).toBe('2026-08-30')

		instance.locale = 'ru'

		expect(instance.weekdays[0].long).toBe(weekdayName('ru', 1))
		expect(instance.months[0].weeks[0][0].date).toBe('2026-08-31')
	})

	it('weekStart перекрывает локаль; не день недели — как не задан', () => {
		const instance = calendar({ locale: 'ru', weekStart: 0 })

		expect(instance.weekdays.map(({ long }) => long)).toEqual(
			[0, 1, 2, 3, 4, 5, 6].map((day) => weekdayName('ru', day)),
		)

		Reflect.set(instance, 'weekStart', 7)

		expect(instance.weekdays[0].long).toBe(weekdayName('ru', 1))
	})

	it('заголовок, номера и имена дней — в локали', () => {
		const instance = calendar({ locale: 'ru', value: '2026-09-10' })

		expect(instance.months[0].title).toBe(
			new Intl.DateTimeFormat('ru', {
				month: 'long',
				year: 'numeric',
				timeZone: 'UTC',
			}).format(Date.UTC(2026, 8, 1)),
		)
		expect(dayOf(instance, '2026-09-10').text).toBe('10')
		expect(dayOf(instance, '2026-09-10').aria['aria-label']).toBe(
			new Intl.DateTimeFormat('ru', { dateStyle: 'full', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 10),
			),
		)
		expect(instance.weekdays[0].short).toBe(
			new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 21),
			),
		)
	})
})

describe('наборы дней', () => {
	it('один tabindex="0" на все месяцы — у дня с фокусом; прочие дни месяца — -1, заполнители — без него', () => {
		const instance = calendar({ value: '2026-09-15', numberOfMonths: 3 })

		instance.focusDate('2026-10-15')

		const days = daysOf(instance)
		const placeholders = allDays(instance).filter(
			(day) => day.dataset['data-outside-month'] === 'true',
		)

		expect(allDays(instance).filter((day) => day.aria.tabindex === '0')).toEqual([
			dayOf(instance, '2026-10-15'),
		])
		expect(days.filter((day) => day.aria.tabindex === '-1')).toHaveLength(days.length - 1)
		expect(days.every((day) => day.aria['aria-hidden'] === null)).toBe(true)

		expect(placeholders.length).toBeGreaterThan(0)

		for (const day of placeholders) {
			expect(day.aria).toEqual({
				tabindex: null,
				'aria-selected': null,
				'aria-disabled': null,
				'aria-current': null,
				'aria-label': null,
				'aria-hidden': 'true',
			})
			expect(day.dataset['data-selected']).toBe('false')
		}
	})

	it('заполнитель не показывает выбор, даже если его дата выбрана', () => {
		// Сентябрьская сетка с воскресенья заканчивается заполнителями 1–3 октября
		const instance = calendar({ mode: 'multiple', value: ['2026-09-15', '2026-10-02'] })
		const placeholder = allDays(instance).find((day) => day.date === '2026-10-02')

		expect(placeholder?.dataset['data-outside-month']).toBe('true')
		expect(placeholder?.dataset['data-selected']).toBe('false')
	})

	it('сегодня — aria-current="date" и data-today', () => {
		const instance = calendar()

		expect(dayOf(instance, '2026-09-26').aria['aria-current']).toBe('date')
		expect(dayOf(instance, '2026-09-25').aria['aria-current']).toBeNull()
		expect(flagged(instance, 'data-today')).toEqual(['2026-09-26'])
	})

	it('«сегодня» — в часовом поясе timeZone', () => {
		vi.setSystemTime(Date.UTC(2026, 8, 26, 20))

		expect(flagged(calendar({ timeZone: 'UTC' }), 'data-today')).toEqual(['2026-09-26'])
		expect(flagged(calendar({ timeZone: 'Asia/Tokyo' }), 'data-today')).toEqual(['2026-09-27'])
		expect(calendar({ timeZone: 'Asia/Tokyo' }).focusedDate).toBe('2026-09-27')
	})

	it('aria-selected стоит и у невыбранных — «false»', () => {
		const instance = calendar({ value: '2026-09-10' })

		expect(dayOf(instance, '2026-09-10').aria['aria-selected']).toBe('true')
		expect(dayOf(instance, '2026-09-11').aria['aria-selected']).toBe('false')
		expect(dayOf(instance, '2026-09-10').dataset['data-selected']).toBe('true')
	})

	it('имя дня — полная дата, текст — номер', () => {
		const day = dayOf(calendar(), '2026-09-10')

		expect(day.text).toBe('10')
		expect(day.aria['aria-label']).toBe(
			new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' }).format(
				Date.UTC(2026, 8, 10),
			),
		)
	})

	it('выключенный календарь: ни одного tabindex, все дни — aria-disabled', () => {
		const instance = calendar({ disabled: true })

		expect(
			daysOf(instance).every(
				(day) => day.aria.tabindex === null && day.aria['aria-disabled'] === 'true',
			),
		).toBe(true)

		instance.disabled = false

		expect(dayOf(instance, '2026-09-26').aria.tabindex).toBe('0')
		expect(dayOf(instance, '2026-09-26').aria['aria-disabled']).toBeNull()
	})

	it('флаги диапазона: начало, середина, конец; однодневный — начало и конец сразу', () => {
		const instance = calendar({ mode: 'range', value: ['2026-09-10', '2026-09-13'] })

		expect(flagged(instance, 'data-selected')).toEqual(datesFrom('2026-09-10', '2026-09-13'))
		expect(flagged(instance, 'data-range-start')).toEqual(['2026-09-10'])
		expect(flagged(instance, 'data-range-middle')).toEqual(['2026-09-11', '2026-09-12'])
		expect(flagged(instance, 'data-range-end')).toEqual(['2026-09-13'])

		instance.value = '2026-09-20'

		expect(flagged(instance, 'data-range-start')).toEqual(['2026-09-20'])
		expect(flagged(instance, 'data-range-end')).toEqual(['2026-09-20'])
		expect(flagged(instance, 'data-range-middle')).toEqual([])
	})

	it('в single и multiple флагов диапазона нет', () => {
		const instance = calendar({ mode: 'multiple', value: ['2026-09-10', '2026-09-11'] })

		expect(flagged(instance, 'data-selected')).toEqual(['2026-09-10', '2026-09-11'])

		for (const name of ['data-range-start', 'data-range-end', 'data-range-middle']) {
			expect(flagged(instance, name)).toEqual([])
		}
	})

	it('сетка: role="grid", имя — заголовок; aria-multiselectable — в multiple и range', () => {
		for (const month of calendar({ numberOfMonths: 2 }).months) {
			expect(month.gridAria).toEqual({
				role: 'grid',
				'aria-labelledby': month.titleAria.id,
				'aria-multiselectable': null,
			})
		}

		expect(calendar({ mode: 'multiple' }).months[0].gridAria['aria-multiselectable']).toBe(
			'true',
		)
		expect(calendar({ mode: 'range' }).months[0].gridAria['aria-multiselectable']).toBe('true')
	})

	it('выходы — снимки: новый объект на каждое чтение', () => {
		const instance = calendar()

		expect(instance.months).not.toBe(instance.months)
		expect(instance.months).toEqual(instance.months)
		expect(instance.weekdays).not.toBe(instance.weekdays)
	})
})

describe('то же значение — не смена', () => {
	it('тот же массив новым объектом, в другом порядке и с повторами событий не шлёт', () => {
		const instance = calendar({ mode: 'multiple', value: ['2026-09-10', '2026-09-20'] })

		instance.focusDate('2026-09-15')

		const { events } = record(instance)

		instance.value = ['2026-09-10', '2026-09-20']
		instance.value = ['2026-09-20', '2026-09-10']
		instance.value = ['2026-09-20', '2026-09-10', '2026-09-20']

		expect(events).toEqual([])
	})

	it('свойства тем же значением событий не шлют', () => {
		const unavailable = (date: string) => date === '2026-09-15'
		const instance = calendar({
			min: '2026-09-01',
			numberOfMonths: 2,
			locale: 'ru',
			weekStart: 1,
			timeZone: 'UTC',
			unavailable,
		})
		const changes = vi.fn()

		instance.events.on('change:mode', changes)
		instance.events.on('change:min', changes)
		instance.events.on('change:numberOfMonths', changes)
		instance.events.on('change:locale', changes)
		instance.events.on('change:weekStart', changes)
		instance.events.on('change:timeZone', changes)
		instance.events.on('change:unavailable', changes)
		instance.events.on('change:month', changes)
		instance.events.on('change:focusedDate', changes)

		instance.mode = 'single'
		instance.min = '2026-09-01'
		instance.numberOfMonths = 2
		instance.locale = 'ru'
		instance.weekStart = 1
		instance.timeZone = 'UTC'
		instance.unavailable = unavailable
		instance.month = instance.month

		expect(changes).not.toHaveBeenCalled()
	})

	it('getProps — свойства календаря и первый показанный месяц', () => {
		const instance = calendar({ mode: 'range', min: '2026-09-01', locale: 'ru' })

		expect(instance.getProps()).toMatchObject({
			mode: 'range',
			min: '2026-09-01',
			max: undefined,
			locale: 'ru',
			numberOfMonths: 1,
			month: '2026-09-01',
			value: undefined,
		})
	})
})
