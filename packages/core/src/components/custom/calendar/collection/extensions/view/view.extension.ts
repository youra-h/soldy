import { TBaseExtension, TBatchExtension, TFactoryExtension } from '../../../../../base/collection'
import type { IExtensionContext } from '../../../../../base/collection'
import {
	addMonths,
	calendarLocale,
	clampDate,
	compareDates,
	monthGrid,
	monthsBetween,
	parseDate,
	startOfMonth,
	todayDate,
} from '../../../../../../common'
import type { TAriaAttributes, TCalendarDate, TMonthGridDay } from '../../../../../../common'
import { calendarBounds, datesOf, inBounds } from '../../../dates'
import type { TCalendarBounds } from '../../../dates'
import type { ICalendarItem, ICalendarItemProps } from '../../../item/types'
import type { ICalendar } from '../../../types'
import { focusOf, selectionOf } from '../guards'
import type {
	ICalendarViewExtension,
	ICalendarViewExtensionOptions,
	TCalendarGrid,
	TCalendarViewEvents,
} from './types'

/** Заполнитель скрыт от скринридера: при нескольких сетках его дата звучала бы дважды. */
const FILLER_ARIA: Readonly<TAriaAttributes> = { 'aria-hidden': 'true' }

/**
 * Смену месяца заголовок объявляет сам: он — вежливая живая область, как
 * заголовок в APG (Date Picker Dialog). Своего анонсера, как у React Aria, у
 * календаря нет, а имя сетки и так даёт этот заголовок.
 */
const TITLE_LIVE = 'polite'

/**
 * Вид календаря: какие месяцы показаны и какие дни поэтому лежат в коллекции.
 *
 * **Коллекция — дни показанных месяцев, и только их.** Заполнители соседних
 * месяцев элементами не бывают: одна дата — один элемент, а при нескольких
 * сетках хвост января — это дни февраля. Состав сверяется по дате
 * (`trackBy`), поэтому листание переиспользует дни, которые остались на
 * экране, и пересоздаёт только новые.
 *
 * **Сетки независимы.** Месяц у каждой свой (январь рядом с сентябрём),
 * один месяц — в одной сетке. Листание сдвигает все сетки разом, выбор месяца
 * меняет одну; месяц, уже показанный другой сеткой, меняет их местами.
 *
 * **Можно ли листать** — `prevDisabled` и `nextDisabled`, об их смене говорит
 * `change:paging`. Итог зависит и от владельца — его границ и «выключен», —
 * поэтому событие шлёт вид: выход фасада коллекции событий владельца не видит.
 *
 * **Что день знает от вида:** выключен ли он (вне `min`/`max` или календарь
 * выключен), размер и вариант календаря, доступное имя (полная дата),
 * `aria-current` и `data-today`, `data-out-of-bounds`. Выбор и фокус дню пишут
 * свои расширения.
 */
export class TCalendarViewExtension
	extends TBaseExtension<ICalendarItem, TCalendarViewEvents>
	implements ICalendarViewExtension
{
	readonly name = 'view' as const

	protected readonly _owner: ICalendar
	private _months: TCalendarDate[] = []
	private _bounds: TCalendarBounds
	/** Каркас сеток и его ключ */
	private _skeletonMemo: { key: string; grids: TGridSkeleton[] } | undefined = undefined
	/** Из чего посчитано то, что день знает от вида */
	private readonly _applied = new WeakMap<ICalendarItem, TViewApplied>()

	constructor(options: ICalendarViewExtensionOptions) {
		super()

		this._owner = options.owner
		this._bounds = calendarBounds(options.owner.min, options.owner.max)
	}

	get months(): TCalendarDate[] {
		return [...this._months]
	}

	override install(ctx: IExtensionContext<ICalendarItem>): void {
		super.install(ctx)

		// Состав сверяется по дате: и у дня в хранилище, и у источника она есть
		this._batch.trackBy = (item) => item.date

		// Дни строит фабрика уже здесь, при установке, — раньше, чем сборка
		// привяжет её к владельцу. Без основы от календаря `id` дней шли бы от
		// `uid` и расходились при гидратации
		const factory = ctx.extensions.factory

		if (factory instanceof TFactoryExtension) factory.bindIdBase(this._owner.idBase)

		// Дни пришли — то, что они знают от вида. На весь состав: при листании
		// новые дни приходят пачкой, и итог `change:items` один. Пишется только
		// новым дням и тем, чьи данные устарели: оставшиеся на экране дни
		// листание не трогает
		ctx.driver.events.on('change:items', () => this._applyStale())

		this._setMonths(this._resolveMonths(this._owner.months))

		const owner = this._owner

		owner.events.on('change:months', () => this._setMonths(this._resolveMonths(owner.months)))
		owner.events.on('change:min', () => this._rebound())
		owner.events.on('change:max', () => this._rebound())

		// Выключенный календарь — выключенные дни и кнопки листания
		owner.events.on('change:disabled', () => {
			this._applyStale()
			this.events.emit('change:paging')
		})

		owner.events.on('change:timeZone', () => this._applyStale())
		owner.events.on('change:weekStart', () => this.events.emit('change:grids'))

		// Номер дня и имя — в цифрах и словах локали: состав тот же, подписи новые
		owner.events.on('change:locale', () => {
			this._build()
			this._applyStale()
			this.events.emit('change:grids')
		})

		// `size` и `variant` элементам диктует владелец — отдаём новые значения
		owner.events.on('change:size', () =>
			ctx.driver.valueOf().forEach((item) => this._applyStyle(item)),
		)
		owner.events.on('change:variant', () =>
			ctx.driver.valueOf().forEach((item) => this._applyStyle(item)),
		)
	}

	/**
	 * Сетки — снимок на каждое чтение: новые объекты, дни — из коллекции.
	 * Раскладка по неделям и заголовки берутся из каркаса, который
	 * пересчитывается, только когда сменились месяцы, первый день недели или
	 * локаль: раскладывать недели и форматировать заголовки через Intl на
	 * каждое чтение незачем.
	 */
	get grids(): TCalendarGrid[] {
		const multiselectable = selectionOf(this._ctx)?.multiselectable ? 'true' : null
		const days = new Map(this._ctx.driver.valueOf().map((item) => [item.date, item]))
		const idBase = `s-calendar-title-${this._owner.idBase}`

		return this._skeleton().map(({ key, title, weeks }, index) => {
			const id = `${idBase}-${index}`

			return {
				key,
				title,
				titleAria: { id, 'aria-live': TITLE_LIVE },
				gridAria: {
					role: 'grid',
					'aria-labelledby': id,
					'aria-multiselectable': multiselectable,
				},
				weeks: weeks.map((week) =>
					week.map(({ date, outside }) => ({
						date,
						item: outside ? undefined : days.get(date),
						aria: outside ? { ...FILLER_ARIA } : {},
					})),
				),
			}
		})
	}

	get prevDisabled(): boolean {
		return (
			this._owner.disabled ||
			compareDates(this._earliest, startOfMonth(this._bounds.low)) <= 0
		)
	}

	get nextDisabled(): boolean {
		return (
			this._owner.disabled || compareDates(this._latest, startOfMonth(this._bounds.high)) >= 0
		)
	}

	showPrev(): void {
		if (this.prevDisabled) return

		this._setMonths(this._months.map((month) => addMonths(month, -1)))
	}

	showNext(): void {
		if (this.nextDisabled) return

		this._setMonths(this._months.map((month) => addMonths(month, 1)))
	}

	showMonth(index: number, month: TCalendarDate): void {
		const target = parseDate(month)

		if (this._owner.disabled || target === undefined || this._months[index] === undefined) {
			return
		}

		const next = [...this._months]
		const wanted = this._clampMonth(startOfMonth(target))
		const other = next.indexOf(wanted)

		if (other !== -1) next[other] = next[index]

		next[index] = wanted

		this._setMonths(next)
	}

	reveal(date: TCalendarDate, from: TCalendarDate): void {
		const month = startOfMonth(date)

		if (this._months.includes(month)) return

		const shift = monthsBetween(startOfMonth(from), month)
		const shifted = this._months.map((item) => addMonths(item, shift))

		if (shifted.every((item) => this._monthInBounds(item))) {
			this._setMonths(shifted)

			return
		}

		// Сдвиг вывел бы сетку за границы — месяц встаёт только в сетку `from`,
		// остальные остаются где были
		const index = this._months.indexOf(startOfMonth(from))

		this.showMonth(index === -1 ? 0 : index, month)
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	private get _batch(): TBatchExtension<ICalendarItem> {
		const batch = this._ctx.extensions.batch

		if (!(batch instanceof TBatchExtension)) {
			throw new Error('TCalendarViewExtension: у коллекции нет расширения batch')
		}

		return batch
	}

	private get _earliest(): TCalendarDate {
		return this._months.reduce((a, b) => (compareDates(b, a) < 0 ? b : a))
	}

	private get _latest(): TCalendarDate {
		return this._months.reduce((a, b) => (compareDates(b, a) > 0 ? b : a))
	}

	/** Каркас сеток: раскладка и заголовки, по ключу из месяцев, первого дня недели и локали. */
	private _skeleton(): TGridSkeleton[] {
		const locale = this._owner.locale
		const first = this._owner.firstDay
		const key = `${locale}|${first}|${this._months.join(',')}`

		if (this._skeletonMemo?.key === key) return this._skeletonMemo.grids

		const labels = calendarLocale(locale)
		const grids = this._months.map((month) => ({
			key: month,
			title: labels.monthTitle(month),
			weeks: monthGrid(month, first),
		}))

		this._skeletonMemo = { key, grids }

		return grids
	}

	private _monthInBounds(month: TCalendarDate): boolean {
		return this._clampMonth(month) === month
	}

	/** Месяц в пределах границ: от месяца `min` до месяца `max`. */
	private _clampMonth(month: TCalendarDate): TCalendarDate {
		return clampDate(month, startOfMonth(this._bounds.low), startOfMonth(this._bounds.high))
	}

	/**
	 * Месяцы сеток из заданных: первые числа, в границах, без повторов. Не
	 * заданы — одна сетка на месяце фокуса, а пока фокуса нет — на месяце
	 * первой выбранной даты, иначе сегодняшнем.
	 */
	private _resolveMonths(raw: TCalendarDate[] | undefined): TCalendarDate[] {
		const given = (raw ?? [])
			.map((item) => parseDate(item))
			.filter((item) => item !== undefined)
			.map((item) => this._clampMonth(startOfMonth(item)))

		const months = [...new Set(given)]

		return months.length > 0 ? months : [this._clampMonth(startOfMonth(this._fallbackDate()))]
	}

	private _fallbackDate(): TCalendarDate {
		const focused = focusOf(this._ctx)?.focusedDate

		if (focused !== undefined) return focused

		const first = datesOf(this._owner.value)[0] ?? todayDate(this._owner.timeZone)

		return clampDate(first, this._bounds.low, this._bounds.high)
	}

	/**
	 * Записать месяцы сеток: состав коллекции, месяцы владельца, события —
	 * только о смене. Возвращает, сменились ли месяцы.
	 */
	private _setMonths(months: TCalendarDate[]): boolean {
		const previous = this._months

		if (months.length === previous.length && months.every((m, i) => m === previous[i])) {
			// Владелец мог записать тот же вид своими словами (не первое число) —
			// у него остаются показанные месяцы
			this._owner.months = this.months

			return false
		}

		this._months = months
		this._build()
		this._owner.months = this.months

		this.events.emit('change:months', this.months, previous)
		this.events.emit('change:grids')
		this.events.emit('change:paging')

		return true
	}

	/** Состав коллекции — дни показанных месяцев, по дате. */
	private _build(): void {
		const locale = calendarLocale(this._owner.locale)
		const sources: Partial<ICalendarItemProps>[] = []

		for (const month of this._months) {
			for (const week of monthGrid(month, 0)) {
				for (const { date, outside } of week) {
					if (!outside) sources.push({ date, text: locale.dayNumber(date) })
				}
			}
		}

		this._batch.update(sources)
	}

	/**
	 * Сменились границы: месяцы прижимаются к ним, дни пересчитывают «выключен».
	 * Листание зависит от границ и тогда, когда сетки остались на месте: `min`
	 * дошёл до месяца первой сетки — «назад» гаснет.
	 */
	private _rebound(): void {
		this._bounds = calendarBounds(this._owner.min, this._owner.max)
		this._applyStale()

		if (!this._setMonths(this._resolveMonths(this._months))) this.events.emit('change:paging')
	}

	/**
	 * То, что день знает от вида, — тем дням, у кого этого ещё нет или оно
	 * посчитано из прежних данных. Данные — ключом: то, из чего запись
	 * посчитана, а не флаг «устарело», поэтому пропустить смену нельзя.
	 * «Сегодня» — одно на проход.
	 */
	private _applyStale(): void {
		if (!this._ctx) return

		const locale = this._owner.locale
		const today = todayDate(this._owner.timeZone)
		const labelKey = `${locale}|${today}`
		const off = this._owner.disabled
		const bounds = this._bounds

		for (const item of this._ctx.driver.valueOf()) {
			const applied = this._applied.get(item)

			if (applied === undefined) this._applyStyle(item)

			if (applied?.labelKey !== labelKey) this._label(item, locale, today)

			if (applied?.off !== off || applied.bounds !== bounds) {
				this._bindDisabled(item, off, bounds)
			}

			this._applied.set(item, { labelKey, off, bounds })
		}
	}

	/** Имя дня — полная дата в локали, `aria-current` и `data-today`. */
	private _label(item: ICalendarItem, locale: string, today: TCalendarDate): void {
		const current = item.date === today

		item.aria.add('aria-label', calendarLocale(locale).fullDate(item.date))
		item.aria.add('aria-current', current ? 'date' : null)
		item.dataset.add('today', current)
	}

	/** `size` и `variant` дня — всегда календаря. */
	private _applyStyle(item: ICalendarItem): void {
		item.size = this._owner.size
		item.variant = this._owner.variant
	}

	/**
	 * «Выключен» дня: выключенный календарь или день вне границ.
	 *
	 * Сеттер дня сверяет со старым сам: `change:disabled` приходит только
	 * тем дням, у кого значение сменилось.
	 */
	private _bindDisabled(item: ICalendarItem, off: boolean, bounds: TCalendarBounds): void {
		item.disabled = off || !inBounds(item.date, bounds)
		item.dataset.add('out-of-bounds', !inBounds(item.date, bounds))
	}
}

/** Каркас сетки — то, что не зависит от дней коллекции и выбора: заголовок и раскладка. */
type TGridSkeleton = { key: TCalendarDate; title: string; weeks: TMonthGridDay[][] }

/** Из чего посчитано то, что день знает от вида. */
type TViewApplied = { labelKey: string; off: boolean; bounds: TCalendarBounds }
