import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TCalendar, TCalendarCollectionFacade } from '@soldy-ui/core'
import type { ICalendarProps, IListBoxItem, TCalendarPicker } from '@soldy-ui/core'

/**
 * Панели выбора месяца и года — расширение `picker` коллекции календаря.
 *
 * Заголовок сетки открывает поповер места, в нём — ListBox: месяцы года или
 * годы страницы. Выбор приходит так, как его передаст разметка, — через
 * расширение списка (`chooseItem`), тем же путём, что клик по строке и Enter.
 * Поповер открывают и закрывают записью `open`, как его плагин указателя.
 *
 * Сегодня во всех тестах — суббота 2026-09-26.
 */

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })
	vi.setSystemTime(new Date(2026, 8, 26, 12))
})

afterEach(() => {
	vi.useRealTimers()
})

/** Календарь и его коллекция — так их собирает адаптер. */
function calendar(props: Partial<ICalendarProps> = {}) {
	const owner = new TCalendar(props)
	const collection = new TCalendarCollectionFacade({}, { owner })
	const { view, picker } = collection.extensions

	return { owner, collection, view, picker }
}

type TCalendarSetup = ReturnType<typeof calendar>

/** Панель места `index`; места нет — тест падает здесь. */
function panel({ collection }: TCalendarSetup, index = 0): TCalendarPicker {
	const found = collection.pickers[index]

	if (!found) throw new Error(`панели на месте ${index} нет`)

	return found
}

/** Открыть панель места — как это делает нажатие на заголовок. */
function open(setup: TCalendarSetup, index = 0): TCalendarPicker {
	panel(setup, index).popover.open = true

	return panel(setup, index)
}

/** Элементы списка панели. */
function options(setup: TCalendarSetup, index = 0): readonly IListBoxItem[] {
	return panel(setup, index).engine.extensions.batch.items
}

/** Выбор пользователя в списке панели — по значению элемента. */
function choose(setup: TCalendarSetup, value: string | number, index = 0): boolean {
	const item = options(setup, index).find((candidate) => candidate.value === value)

	if (!item) throw new Error(`${value} нет в списке`)

	return panel(setup, index).engine.extensions.list.chooseItem(item)
}

const values = (setup: TCalendarSetup, index = 0) => options(setup, index).map((item) => item.value)

const disabled = (setup: TCalendarSetup, index = 0) =>
	options(setup, index)
		.filter((item) => item.disabled)
		.map((item) => item.value)

/** Год и отрезок лет — тем же форматтером, что календарь: строки Intl зависят от версии ICU. */
const year = (value: number, locale = 'en-US') =>
	new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' }).format(
		Date.UTC(value, 0, 1),
	)

const years = (from: number, to: number, locale = 'en-US') =>
	new Intl.DateTimeFormat(locale, { year: 'numeric', timeZone: 'UTC' }).formatRange(
		Date.UTC(from, 0, 1),
		Date.UTC(to, 0, 1),
	)

const MONTHS_2026 = Array.from(
	{ length: 12 },
	(_, index) => `2026-${String(index + 1).padStart(2, '0')}-01`,
)

describe('места', () => {
	it('панель на каждую сетку; экземпляры места переживают листание', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })
		const [first, second] = setup.collection.pickers

		expect(setup.collection.pickers).toHaveLength(2)
		expect(first.popover).not.toBe(second.popover)
		expect(first.list).not.toBe(second.list)

		setup.view.showNext()

		expect(panel(setup, 0).popover).toBe(first.popover)
		expect(panel(setup, 0).list).toBe(first.list)
		expect(panel(setup, 0).engine).toBe(first.engine)
	})

	it('поповер без кнопки закрытия, содержимое — до первого открытия не смонтировано', () => {
		const { popover } = panel(calendar())

		expect(popover.closable).toBe(false)
		expect(popover.lazyMount).toBe(true)
		expect(popover.open).toBe(false)
	})

	it('сетки меньше — место без сетки закрывает свою панель', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })
		const second = open(setup, 1)

		setup.owner.months = ['2026-01-01']

		expect(second.popover.open).toBe(false)
		expect(setup.collection.pickers).toHaveLength(1)
	})

	it('без календаря панелей нет', () => {
		const collection = new TCalendarCollectionFacade()

		expect(collection.pickers).toEqual([])
	})
})

describe('месяцы', () => {
	it('открытие — 12 месяцев года сетки, выбран месяц сетки, в шапке год', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const picker = open(setup)

		expect(picker.level).toBe('months')
		expect(picker.heading).toBe(year(2026))
		expect(values(setup)).toEqual(MONTHS_2026)
		expect(options(setup).map((item) => item.text)).toEqual(
			MONTHS_2026.map((month) =>
				new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(
					Date.UTC(2026, Number(month.slice(5, 7)) - 1, 1),
				),
			),
		)
		expect(picker.list.value).toBe('2026-09-01')
		expect(picker.engine.extensions.selection.selected.map((item) => item.value)).toEqual([
			'2026-09-01',
		])
	})

	it('выбор месяца показывает его в сетке и закрывает панель', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const picker = open(setup)

		expect(choose(setup, '2026-03-01')).toBe(true)

		expect(setup.owner.months).toEqual(['2026-03-01'])
		expect(picker.popover.open).toBe(false)
	})

	it('выбор показанного месяца тоже закрывает панель, сетка на месте', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const picker = open(setup)

		choose(setup, '2026-09-01')

		expect(setup.owner.months).toEqual(['2026-09-01'])
		expect(picker.popover.open).toBe(false)
	})

	it('месяц другой сетки — сетки меняются местами', () => {
		const setup = calendar({ months: ['2026-01-01', '2026-09-01'] })

		open(setup, 1)
		choose(setup, '2026-01-01', 1)

		expect(setup.owner.months).toEqual(['2026-09-01', '2026-01-01'])
	})

	it('открытая панель идёт за месяцем своей сетки и за локалью', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const picker = open(setup)

		setup.view.showNext()

		expect(picker.list.value).toBe('2026-10-01')

		setup.owner.locale = 'ru-RU'

		expect(options(setup)[2].text).toBe(
			new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: 'UTC' }).format(
				Date.UTC(2026, 2, 1),
			),
		)
	})
})

describe('годы', () => {
	it('кнопка шапки — годы страницы, выбран год панели; в шапке отрезок', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)
		setup.picker.toggleLevel(0)

		const picker = panel(setup)

		expect(picker.level).toBe('years')
		expect(picker.heading).toBe(years(2017, 2028))
		expect(values(setup)).toEqual([
			2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028,
		])
		expect(picker.list.value).toBe(2026)
		expect(picker.popover.open).toBe(true)
	})

	it('выбор года — снова месяцы, уже этого года; панель открыта, выбранного нет', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)
		setup.picker.toggleLevel(0)
		choose(setup, 2028)

		const picker = panel(setup)

		expect(picker.level).toBe('months')
		expect(picker.heading).toBe(year(2028))
		expect(values(setup)[0]).toBe('2028-01-01')
		expect(picker.list.value).toBeUndefined()
		expect(picker.popover.open).toBe(true)
		expect(setup.owner.months).toEqual(['2026-09-01'])

		choose(setup, '2028-03-01')

		expect(setup.owner.months).toEqual(['2028-03-01'])
		expect(picker.popover.open).toBe(false)
	})

	it('выбор выбранного года — тоже месяцы, хотя в single он снимает выбор', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)
		setup.picker.toggleLevel(0)
		choose(setup, 2026)

		expect(panel(setup).level).toBe('months')
		expect(panel(setup).list.value).toBe('2026-09-01')
	})

	it('кнопка шапки на годах возвращает месяцы того же года', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)
		setup.picker.toggleLevel(0)
		setup.picker.toggleLevel(0)

		expect(panel(setup).level).toBe('months')
		expect(panel(setup).list.value).toBe('2026-09-01')
	})

	it('страницы — по 12 лет от 0001, а не вокруг года', () => {
		const setup = calendar({ months: ['2028-09-01'] })

		open(setup)
		setup.picker.toggleLevel(0)

		expect(values(setup)[0]).toBe(2017)

		const first = calendar({ months: ['0005-09-01'] })

		open(first)
		first.picker.toggleLevel(0)

		expect(values(first)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
		expect(panel(first).prevDisabled).toBe(true)
	})

	it('последняя страница — до 9999: лет за ним нет', () => {
		const setup = calendar({ months: ['9999-12-01'] })

		open(setup)
		setup.picker.toggleLevel(0)

		expect(values(setup)).toEqual([9997, 9998, 9999])
		expect(panel(setup).heading).toBe(years(9997, 9999))
		expect(panel(setup).nextDisabled).toBe(true)
	})
})

describe('стрелки', () => {
	it('на месяцах — год, на годах — страница из 12 лет', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)
		setup.picker.showNext(0)

		expect(panel(setup).heading).toBe(year(2027))
		expect(values(setup)[0]).toBe('2027-01-01')
		expect(panel(setup).list.value).toBeUndefined()

		setup.picker.toggleLevel(0)
		setup.picker.showNext(0)

		expect(values(setup)[0]).toBe(2029)

		setup.picker.showPrev(0)
		setup.picker.showPrev(0)

		expect(values(setup)[0]).toBe(2005)
		expect(panel(setup).heading).toBe(years(2005, 2016))
	})

	it('имена — по уровню, по умолчанию английские', () => {
		const setup = calendar()

		open(setup)

		expect(panel(setup).prevAria).toEqual({ 'aria-label': 'Previous year' })
		expect(panel(setup).nextAria).toEqual({ 'aria-label': 'Next year' })

		setup.picker.toggleLevel(0)

		expect(panel(setup).prevAria).toEqual({ 'aria-label': 'Previous 12 years' })
		expect(panel(setup).nextAria).toEqual({ 'aria-label': 'Next 12 years' })
	})

	it('смена имени — change:pickers и новый набор; то же имя — не смена', () => {
		const setup = calendar()
		const changes = vi.fn()

		setup.collection.events.on('change:pickers', changes)
		setup.owner.prevYearLabel = 'Предыдущий год'

		expect(changes).toHaveBeenCalledTimes(1)
		expect(panel(setup).prevAria).toEqual({ 'aria-label': 'Предыдущий год' })

		setup.owner.prevYearLabel = 'Предыдущий год'

		expect(changes).toHaveBeenCalledTimes(1)
	})
})

describe('границы', () => {
	it('месяцы вне min/max выключены и не выбираются; стрелка к ним гаснет', () => {
		const setup = calendar({ months: ['2026-09-01'], min: '2025-05-10', max: '2026-10-20' })

		open(setup)

		expect(disabled(setup)).toEqual(['2026-11-01', '2026-12-01'])
		expect(panel(setup).nextDisabled).toBe(true)
		expect(panel(setup).prevDisabled).toBe(false)
		expect(choose(setup, '2026-11-01')).toBe(false)
		expect(setup.owner.months).toEqual(['2026-09-01'])

		setup.picker.showNext(0)

		expect(panel(setup).heading).toBe(year(2026))

		setup.picker.showPrev(0)

		expect(disabled(setup)).toEqual(['2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01'])
		expect(panel(setup).prevDisabled).toBe(true)
	})

	it('годы вне min/max выключены; листать страницы некуда', () => {
		const setup = calendar({ months: ['2026-09-01'], min: '2025-05-10', max: '2026-10-20' })

		open(setup)
		setup.picker.toggleLevel(0)

		expect(values(setup).filter((value) => !disabled(setup).includes(value))).toEqual([
			2025, 2026,
		])
		expect(panel(setup).prevDisabled).toBe(true)
		expect(panel(setup).nextDisabled).toBe(true)
	})

	it('смена границы пересобирает открытую панель', () => {
		const setup = calendar({ months: ['2026-09-01'] })

		open(setup)

		expect(disabled(setup)).toEqual([])

		setup.owner.max = '2026-10-20'

		expect(disabled(setup)).toEqual(['2026-11-01', '2026-12-01'])
		expect(panel(setup).nextDisabled).toBe(true)
	})

	it('выключенный календарь закрывает панели', () => {
		const setup = calendar()
		const picker = open(setup)

		setup.owner.disabled = true

		expect(picker.popover.open).toBe(false)
	})
})

describe('повторное открытие', () => {
	it('начинается с месяцев года сетки, что бы панель ни показывала до закрытия', () => {
		const setup = calendar({ months: ['2026-09-01'] })
		const picker = open(setup)

		setup.picker.toggleLevel(0)
		setup.picker.showNext(0)
		picker.popover.open = false
		open(setup)

		expect(panel(setup).level).toBe('months')
		expect(panel(setup).heading).toBe(year(2026))
		expect(panel(setup).list.value).toBe('2026-09-01')
	})
})

describe('шапка', () => {
	it('id шапки — из наборов места; его смена — change:pickers', () => {
		const setup = calendar()
		const changes = vi.fn()

		expect(panel(setup).labelledBy).toBeUndefined()

		setup.collection.events.on('change:pickers', changes)
		setup.picker.pickerSets(0).heading.add('id', 'heading-0')

		expect(changes).toHaveBeenCalledTimes(1)
		expect(panel(setup).labelledBy).toBe('heading-0')
		expect(panel(setup).headingAria).toEqual({ id: 'heading-0' })
	})

	it('шапка в календаре локали: у th-TH год буддийский', () => {
		const setup = calendar({ months: ['2026-09-01'], locale: 'th-TH' })

		open(setup)

		expect(panel(setup).heading).toBe(
			new Intl.DateTimeFormat(['th-TH', 'en-US'], {
				year: 'numeric',
				calendar: 'buddhist',
				timeZone: 'UTC',
			}).format(Date.UTC(2026, 0, 1)),
		)
	})
})
