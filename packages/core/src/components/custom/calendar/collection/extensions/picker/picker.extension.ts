import { TBaseExtension } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import {
	TAria,
	calendarLocale,
	compareDates,
	dateFromParts,
	startOfMonth,
	yearOf,
} from '../../../../../../common'
import type { TAriaAttributes, TCalendarDate } from '../../../../../../common'
import { TPopover } from '../../../../popover'
import type { IPopover } from '../../../../popover'
import { TListBox, createEngineListBox } from '../../../../list-box'
import type {
	IListBox,
	IListBoxItem,
	IListBoxItemProps,
	TListBoxCollection,
} from '../../../../list-box'
import type { TListContentFit } from '../../../../list'
import { calendarBounds } from '../../../dates'
import type { ICalendarItem } from '../../../item/types'
import type { ICalendar } from '../../../types'
import { viewOf } from '../guards'
import type { TCalendarEngineOptions } from '../view'
import type {
	ICalendarPickerExtension,
	TCalendarPicker,
	TCalendarPickerEvents,
	TCalendarPickerLevel,
	TCalendarPickerSets,
} from './types'

/** Лет на странице — 4 колонки по 3 строки. */
const PAGE_SIZE = 12

/** Годы поддерживаемых дат: у года четыре цифры. */
const FIRST_YEAR = 1
const LAST_YEAR = 9999

/** Месяцы года — от 1. */
const MONTHS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * Что делать с подписью шире плитки — по уровню. Имя месяца режется
 * многоточием: это короткая форма, обычно одно слово, и слову шире плитки
 * перенос не поможет — его пришлось бы рвать. Подпись года переносится между
 * словами: у `th-TH` она с эрой («พ.ศ. 2569»), и многоточие срезало бы номер —
 * то, по чему год и выбирают.
 */
const CONTENT_FIT: Readonly<Record<TCalendarPickerLevel, TListContentFit>> = {
	months: 'truncate',
	years: 'wrap',
}

/**
 * Место панели: что она показывает и её экземпляры. Уровень, год и страница
 * — память места, а не владельца: у каждой сетки панель своя.
 */
type TPlace = {
	readonly popover: IPopover
	readonly list: IListBox
	readonly engine: TListBoxCollection
	readonly sets: TCalendarPickerSets
	level: TCalendarPickerLevel
	/** Год месяцев — что показывает уровень месяцев */
	year: number
	/** Первый год страницы — что показывает уровень лет */
	page: number
}

/**
 * Панели выбора месяца и года: заголовок сетки открывает поповер со списком
 * месяцев, шапка с годом меняет месяцы на годы, выбор года возвращает
 * месяцы, выбор месяца показывает его в сетке и закрывает панель.
 *
 * Расширение коллекции, а не разметка: панели нужны и владелец — локаль,
 * границы, выключенность, имена стрелок, — и вид — месяц сетки и
 * `showMonth`. Связки «выбрали месяц → показать и закрыть» и «выбрали год →
 * снова месяцы» решаются здесь один раз, а не в разметке каждого адаптера.
 *
 * **Экземпляры — готовые, как панель «…» у Tags и теги у Select.** На место
 * сетки — `TPopover` и `TListBox` с его движком. Создаёт и слушает их
 * расширение, разметка отдаёт их компонентам. Список — ListBox и его
 * коллекция: своего выбора над месяцами у календаря нет. Выбранным в списке
 * стоит то, что сейчас показано: месяц сетки на уровне месяцев, год панели
 * на уровне лет. Выбор пользователя приходит событием `choose` списка — по
 * `change:selection` его не отличить от снятия выбора: в `single` повторное
 * нажатие на выбранный выбор снимает.
 *
 * **Место, а не месяц.** Панель у сетки, как наборы заголовка у вида
 * (`gridSets`): листание меняет месяц сетки, а заголовок и его панель
 * остаются. Мест столько, сколько сеток; место, которого больше нет, свою
 * панель закрывает.
 *
 * **Состав списка — при открытии.** Открытая панель начинает с месяцев года
 * своей сетки. Пока она закрыта, список не пересобирается: содержимое панели
 * не смонтировано до первого открытия (`lazyMount`), а потом спрятано.
 * Открытая — пересобирается на смену месяца сетки, локали и границ.
 *
 * **Страницы лет — по 12 подряд от `0001`** (`0001–0012`, …, `2017–2028`),
 * а не вокруг текущего года: страница не зависит от того, с какого года
 * начали листать. Годы вне `min`/`max` выключены, за `9999` элементов нет —
 * последняя страница короче.
 */
export class TCalendarPickerExtension
	extends TBaseExtension<ICalendarItem, TCalendarPickerEvents, TCalendarEngineOptions>
	implements ICalendarPickerExtension
{
	readonly name = 'picker' as const

	private readonly _places: TPlace[] = []

	override install(ctx: IExtensionContext<ICalendarItem, TCalendarEngineOptions>): void {
		super.install(ctx)

		// Месяцы сеток сменились: мест бывает больше или меньше, а открытая
		// панель показывает выбранным месяц своей сетки
		viewOf(ctx)?.events.on('change:months', () => this._refresh())

		// Календарь — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился календарь, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			this._refresh()

			// Подписи и границы — открытая панель пересобирается
			scope.on(owner.events, 'change:locale', () => this._refresh())
			scope.on(owner.events, 'change:min', () => this._refresh())
			scope.on(owner.events, 'change:max', () => this._refresh())

			// Имена стрелок — только выход
			scope.on(owner.events, 'change:prevYearLabel', () => this._notify())
			scope.on(owner.events, 'change:nextYearLabel', () => this._notify())
			scope.on(owner.events, 'change:prevYearsLabel', () => this._notify())
			scope.on(owner.events, 'change:nextYearsLabel', () => this._notify())

			// Выключенный календарь выбирать не даёт: заголовок выключен, а
			// открытая панель закрывается
			scope.on(owner.events, 'change:disabled', (off: boolean) => {
				if (off) this._places.forEach((place) => (place.popover.open = false))
			})
		})
	}

	/** Панели мест — по одной на сетку. Календаря нет — сеток и панелей тоже. */
	get pickers(): TCalendarPicker[] {
		const owner = this._ctx.options.get('owner')
		const months = viewOf(this._ctx)?.months ?? []

		if (!owner) return []

		return months.map((_, index) => this._snapshot(owner, this._place(index)))
	}

	/**
	 * Наборы места `index`: в них пишет плагин связок. У нового места наборы
	 * заводятся вместе с ним; их смена — `change:pickers`.
	 */
	pickerSets(index: number): TCalendarPickerSets {
		return this._place(index).sets
	}

	toggleLevel(index: number): void {
		const place = this._places[index]

		if (!place) return

		if (place.level === 'months') {
			place.level = 'years'
			place.page = pageOf(place.year)
		} else {
			place.level = 'months'
		}

		this._fill(place, index)
		this._notify()
	}

	showPrev(index: number): void {
		this._page(index, -1)
	}

	showNext(index: number): void {
		this._page(index, 1)
	}

	/**
	 * Нажатие по подложке — по самой панели вокруг её содержимого: панель
	 * накрывает календарь, а выбирают в содержимом. Закрывает записью `open`,
	 * как выбор месяца, и фокус на заголовок возвращает плагин фокуса поповера.
	 */
	close(index: number): void {
		const place = this._places[index]

		if (place) place.popover.open = false
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Место `index`; его ещё нет — заводится со своими экземплярами. */
	private _place(index: number): TPlace {
		const existing = this._places[index]

		if (existing) return existing

		// Без кнопки закрытия, как панель «…» у Tags: закрывают её выбор
		// месяца, нажатие мимо, Escape, повторное нажатие на заголовок,
		// нажатие по подложке (`close`) и жест за полосу — панель смахивают
		// к её краю, вверх (край задаёт разметка). Содержимое не монтируется
		// до первого открытия
		const popover = new TPopover({ closable: false, lazyMount: true, swipe: 'handle' })
		const list = new TListBox()
		const engine = createEngineListBox({ owner: list })
		const month = this._gridMonth(index)
		const year = month === undefined ? FIRST_YEAR : yearOf(month)
		const place: TPlace = {
			popover,
			list,
			engine,
			sets: { heading: new TAria() },
			level: 'months',
			year,
			page: pageOf(year),
		}

		// Состав сверяется по значению: пересборка того же года не пересоздаёт
		// элементы, и подсветка клавиатуры остаётся на месте
		engine.extensions.batch.trackBy = (item) => item.value

		// Экземпляры места — свои, живут вместе с расширением: подписки прямые
		popover.events.on('change:open', (open: boolean) => {
			if (open) this._open(place, index)
		})
		engine.extensions.list.events.on('choose', (item: IListBoxItem) =>
			this._choose(place, index, item),
		)
		place.sets.heading.events.on('change', () => this._notify())

		this._places[index] = place

		return place
	}

	/** Панель открылась — с месяцев года своей сетки. */
	private _open(place: TPlace, index: number): void {
		const month = this._gridMonth(index)

		if (month !== undefined) place.year = yearOf(month)

		place.level = 'months'
		place.page = pageOf(place.year)

		this._fill(place, index)
		this._notify()
	}

	/**
	 * Выбор пользователя. Месяц — в сетку, и панель закрывается; закрывается
	 * она раньше: открытой панели пришлось бы пересобрать список под новый
	 * месяц сетки. Год — снова месяцы, уже этого года, панель открыта.
	 */
	private _choose(place: TPlace, index: number, item: IListBoxItem): void {
		const value = item.value

		if (place.level === 'months') {
			if (typeof value !== 'string') return

			place.popover.open = false
			viewOf(this._ctx)?.showMonth(index, value)

			return
		}

		if (typeof value !== 'number') return

		place.year = value
		place.level = 'months'

		this._fill(place, index)
		this._notify()
	}

	/** Стрелка: на месяцах — год, на годах — страница; дальше листать некуда — ничего. */
	private _page(index: number, step: -1 | 1): void {
		const place = this._places[index]
		const owner = this._ctx.options.get('owner')

		if (!place || !owner) return

		const snapshot = this._snapshot(owner, place)

		if (step < 0 ? snapshot.prevDisabled : snapshot.nextDisabled) return

		if (place.level === 'months') {
			place.year += step
		} else {
			place.page += step * PAGE_SIZE
		}

		this._fill(place, index)
		this._notify()
	}

	/**
	 * Месяцы сеток или владелец сменились: заводятся новые места, место без
	 * сетки закрывает панель, открытые панели пересобираются.
	 */
	private _refresh(): void {
		const count = viewOf(this._ctx)?.months.length ?? 0

		for (let index = 0; index < count; index++) this._place(index)

		this._places.forEach((place, index) => {
			if (index >= count) {
				place.popover.open = false
			} else if (place.popover.open) {
				this._fill(place, index)
			}
		})

		this._notify()
	}

	/**
	 * Состав списка по уровню и что в нём выбрано — то, что сейчас показано:
	 * месяц сетки среди месяцев, год панели среди лет. Значение списка
	 * пишется после состава: расширение `value` сводит его с выбором по
	 * значениям элементов. Подпись шире плитки список режет или переносит —
	 * тоже по уровню (`CONTENT_FIT`).
	 */
	private _fill(place: TPlace, index: number): void {
		const owner = this._ctx.options.get('owner')

		if (!owner) return

		const locale = calendarLocale(owner.locale)
		const bounds = this._yearBounds(owner)

		place.list.contentFit = CONTENT_FIT[place.level]

		if (place.level === 'months') {
			const dates = calendarBounds(owner.min, owner.max)
			const low = startOfMonth(dates.low)
			const high = startOfMonth(dates.high)
			const sources: Partial<IListBoxItemProps>[] = MONTHS.map((month) => {
				const date = dateFromParts(place.year, month, 1)

				return {
					value: date,
					text: locale.monthName(date),
					disabled: compareDates(date, low) < 0 || compareDates(date, high) > 0,
				}
			})
			const shown = this._gridMonth(index)

			place.engine.extensions.batch.update(sources)
			place.list.value =
				shown !== undefined && yearOf(shown) === place.year ? shown : undefined

			return
		}

		const sources: Partial<IListBoxItemProps>[] = []

		for (let year = place.page; year < place.page + PAGE_SIZE; year++) {
			if (year < FIRST_YEAR || year > LAST_YEAR) continue

			sources.push({
				value: year,
				text: locale.yearTitle(dateFromParts(year, 1, 1)),
				disabled: year < bounds.low || year > bounds.high,
			})
		}

		place.engine.extensions.batch.update(sources)
		place.list.value =
			place.year >= place.page && place.year < place.page + PAGE_SIZE ? place.year : undefined
	}

	/** Выход места — снимок, новые объекты на каждое чтение. */
	private _snapshot(owner: ICalendar, place: TPlace): TCalendarPicker {
		const locale = calendarLocale(owner.locale)
		const bounds = this._yearBounds(owner)
		const months = place.level === 'months'
		const first = months ? place.year : place.page
		const last = months ? place.year : place.page + PAGE_SIZE - 1

		return {
			popover: place.popover,
			list: place.list,
			engine: place.engine,
			level: place.level,
			heading: months
				? locale.yearTitle(dateFromParts(place.year, 1, 1))
				: locale.yearsTitle(
						dateFromParts(Math.max(first, FIRST_YEAR), 1, 1),
						dateFromParts(Math.min(last, LAST_YEAR), 1, 1),
					),
			headingAria: place.sets.heading.toObject(),
			labelledBy: place.sets.heading.get('id'),
			prevAria: label(months ? owner.prevYearLabel : owner.prevYearsLabel),
			nextAria: label(months ? owner.nextYearLabel : owner.nextYearsLabel),
			prevDisabled: first - 1 < bounds.low,
			nextDisabled: last + 1 > bounds.high,
		}
	}

	/** Годы, которые можно выбрать: от года `min` до года `max`. */
	private _yearBounds(owner: ICalendar): { low: number; high: number } {
		const { low, high } = calendarBounds(owner.min, owner.max)

		return { low: yearOf(low), high: yearOf(high) }
	}

	/** Месяц сетки на месте `index`; сетки нет — `undefined`. */
	private _gridMonth(index: number): TCalendarDate | undefined {
		return viewOf(this._ctx)?.months[index]
	}

	private _notify(): void {
		this.events.emit('change:pickers')
	}
}

/** Первый год страницы, на которой лежит `year`: страницы — по 12 лет от `0001`. */
function pageOf(year: number): number {
	return year - ((((year - FIRST_YEAR) % PAGE_SIZE) + PAGE_SIZE) % PAGE_SIZE)
}

/** Набор стрелки: только имя — значка в ней нет. */
function label(text: string): TAriaAttributes {
	return { 'aria-label': text }
}
