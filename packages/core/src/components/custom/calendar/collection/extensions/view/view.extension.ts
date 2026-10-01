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
	TCalendarEngineOptions,
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
 * Календарь — опция движка (`owner`): он приходит и уходит после сборки, и
 * вид наблюдает его (`ctx.options.watch`). Месяцы, границы и подписи — его,
 * поэтому пришедший календарь строит вид заново, а без календаря нет ни сеток,
 * ни дней.
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
	extends TBaseExtension<ICalendarItem, TCalendarViewEvents, TCalendarEngineOptions>
	implements ICalendarViewExtension
{
	readonly name = 'view' as const

	private _months: TCalendarDate[] = []
	private _bounds: TCalendarBounds = calendarBounds(undefined, undefined)
	/** Каркас сеток и его ключ */
	private _skeletonMemo: { key: string; grids: TGridSkeleton[] } | undefined = undefined
	/** Из чего посчитано то, что день знает от вида. У нового календаря — заново */
	private _applied = new WeakMap<ICalendarItem, TViewApplied>()

	get months(): TCalendarDate[] {
		return [...this._months]
	}

	override install(ctx: IExtensionContext<ICalendarItem, TCalendarEngineOptions>): void {
		super.install(ctx)

		// Состав сверяется по дате: и у дня в хранилище, и у источника она есть
		this._batch.trackBy = (item) => item.date

		// Дни пришли — то, что они знают от вида. На весь состав: при листании
		// новые дни приходят пачкой, и итог `change:items` один. Пишется только
		// новым дням и тем, чьи данные устарели: оставшиеся на экране дни
		// листание не трогает
		ctx.driver.events.on('change:items', () => this._applyStale())

		// Календарь — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился календарь, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Дни строит фабрика, как только календарь пришёл, — раньше, чем
			// сборка привяжет её к владельцу. Без основы от календаря `id` дней
			// шли бы от `uid` и расходились при гидратации
			const factory = ctx.extensions.factory

			if (factory instanceof TFactoryExtension) factory.bindIdBase(owner.idBase)

			// Вид нового календаря строится с нуля: его месяцы, границы и
			// подписи, а дни, оставшиеся от прежнего, знают от вида заново
			this._bounds = calendarBounds(owner.min, owner.max)
			this._applied = new WeakMap()
			this._months = []
			this._setMonths(owner, this._resolveMonths(owner.months, this._startDate(owner)))
			this._applyStale()

			scope.on(owner.events, 'change:months', () =>
				this._setMonths(
					owner,
					this._resolveMonths(owner.months, this._fallbackDate(owner)),
				),
			)
			scope.on(owner.events, 'change:min', () => this._rebound(owner))
			scope.on(owner.events, 'change:max', () => this._rebound(owner))

			// Выключенный календарь — выключенные дни и кнопки листания
			scope.on(owner.events, 'change:disabled', () => {
				this._applyStale()
				this.events.emit('change:paging')
			})

			scope.on(owner.events, 'change:timeZone', () => this._applyStale())
			scope.on(owner.events, 'change:weekStart', () => this.events.emit('change:grids'))

			// Номер дня и имя — в цифрах и словах локали: состав тот же, подписи новые
			scope.on(owner.events, 'change:locale', () => {
				this._build(owner)
				this._applyStale()
				this.events.emit('change:grids')
			})

			// `size` и `variant` элементам диктует владелец — отдаём новые значения
			scope.on(owner.events, 'change:size', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)
			scope.on(owner.events, 'change:variant', () =>
				ctx.driver.valueOf().forEach((item) => this._applyStyle(item, owner)),
			)
		})
	}

	/**
	 * Сетки — снимок на каждое чтение: новые объекты, дни — из коллекции.
	 * Раскладка по неделям и заголовки берутся из каркаса, который
	 * пересчитывается, только когда сменились месяцы, первый день недели или
	 * локаль: раскладывать недели и форматировать заголовки через Intl на
	 * каждое чтение незачем. Календаря нет — сеток тоже.
	 */
	get grids(): TCalendarGrid[] {
		const owner = this._ctx.options.get('owner')

		if (!owner) return []

		const multiselectable = selectionOf(this._ctx)?.multiselectable ? 'true' : null
		const days = new Map(this._ctx.driver.valueOf().map((item) => [item.date, item]))
		const idBase = `s-calendar-title-${owner.idBase}`

		return this._skeleton(owner).map(({ key, title, weeks }, index) => {
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

	/** Листать некуда и без календаря: месяцев нет. */
	get prevDisabled(): boolean {
		const earliest = this._earliest

		return (
			earliest === undefined ||
			this._isOff() ||
			compareDates(earliest, startOfMonth(this._bounds.low)) <= 0
		)
	}

	get nextDisabled(): boolean {
		const latest = this._latest

		return (
			latest === undefined ||
			this._isOff() ||
			compareDates(latest, startOfMonth(this._bounds.high)) >= 0
		)
	}

	showPrev(): void {
		const owner = this._ctx.options.get('owner')

		if (!owner || this.prevDisabled) return

		this._setMonths(
			owner,
			this._months.map((month) => addMonths(month, -1)),
		)
	}

	showNext(): void {
		const owner = this._ctx.options.get('owner')

		if (!owner || this.nextDisabled) return

		this._setMonths(
			owner,
			this._months.map((month) => addMonths(month, 1)),
		)
	}

	showMonth(index: number, month: TCalendarDate): void {
		const owner = this._ctx.options.get('owner')
		const target = parseDate(month)

		if (!owner || owner.disabled || target === undefined || this._months[index] === undefined) {
			return
		}

		const next = [...this._months]
		const wanted = this._clampMonth(startOfMonth(target))
		const other = next.indexOf(wanted)

		if (other !== -1) next[other] = next[index]

		next[index] = wanted

		this._setMonths(owner, next)
	}

	reveal(date: TCalendarDate, from: TCalendarDate): void {
		const owner = this._ctx.options.get('owner')
		const month = startOfMonth(date)

		if (!owner || this._months.includes(month)) return

		const shift = monthsBetween(startOfMonth(from), month)
		const shifted = this._months.map((item) => addMonths(item, shift))

		if (shifted.every((item) => this._monthInBounds(item))) {
			this._setMonths(owner, shifted)

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

	private get _earliest(): TCalendarDate | undefined {
		return this._months.reduce<TCalendarDate | undefined>(
			(a, b) => (a === undefined || compareDates(b, a) < 0 ? b : a),
			undefined,
		)
	}

	private get _latest(): TCalendarDate | undefined {
		return this._months.reduce<TCalendarDate | undefined>(
			(a, b) => (a === undefined || compareDates(b, a) > 0 ? b : a),
			undefined,
		)
	}

	/** Выключен ли календарь. Нет календаря — листать нечего. */
	private _isOff(): boolean {
		return this._ctx.options.get('owner')?.disabled ?? true
	}

	/** Каркас сеток: раскладка и заголовки, по ключу из месяцев, первого дня недели и локали. */
	private _skeleton(owner: ICalendar): TGridSkeleton[] {
		const locale = owner.locale
		const first = owner.firstDay
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
	 * заданы — одна сетка на месяце запасной даты.
	 */
	private _resolveMonths(
		raw: TCalendarDate[] | undefined,
		fallback: TCalendarDate,
	): TCalendarDate[] {
		const given = (raw ?? [])
			.map((item) => parseDate(item))
			.filter((item) => item !== undefined)
			.map((item) => this._clampMonth(startOfMonth(item)))

		const months = [...new Set(given)]

		return months.length > 0 ? months : [this._clampMonth(startOfMonth(fallback))]
	}

	/** Запасная дата — день фокуса, а пока фокуса нет — дата, с которой календарь начинает. */
	private _fallbackDate(owner: ICalendar): TCalendarDate {
		return focusOf(this._ctx)?.focusedDate ?? this._startDate(owner)
	}

	/** С чего календарь начинает: первая выбранная дата, иначе сегодня, в границах. */
	private _startDate(owner: ICalendar): TCalendarDate {
		const first = datesOf(owner.value)[0] ?? todayDate(owner.timeZone)

		return clampDate(first, this._bounds.low, this._bounds.high)
	}

	/**
	 * Записать месяцы сеток: состав коллекции, месяцы владельца, события —
	 * только о смене. Возвращает, сменились ли месяцы.
	 */
	private _setMonths(owner: ICalendar, months: TCalendarDate[]): boolean {
		const previous = this._months

		if (months.length === previous.length && months.every((m, i) => m === previous[i])) {
			// Владелец мог записать тот же вид своими словами (не первое число) —
			// у него остаются показанные месяцы
			owner.months = this.months

			return false
		}

		this._months = months
		this._build(owner)
		owner.months = this.months

		this.events.emit('change:months', this.months, previous)
		this.events.emit('change:grids')
		this.events.emit('change:paging')

		return true
	}

	/** Состав коллекции — дни показанных месяцев, по дате. */
	private _build(owner: ICalendar): void {
		const locale = calendarLocale(owner.locale)
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
	private _rebound(owner: ICalendar): void {
		this._bounds = calendarBounds(owner.min, owner.max)
		this._applyStale()

		const months = this._resolveMonths(this._months, this._fallbackDate(owner))

		if (!this._setMonths(owner, months)) this.events.emit('change:paging')
	}

	/**
	 * То, что день знает от вида, — тем дням, у кого этого ещё нет или оно
	 * посчитано из прежних данных. Данные — ключом: то, из чего запись
	 * посчитана, а не флаг «устарело», поэтому пропустить смену нельзя.
	 * «Сегодня» — одно на проход. Календаря нет — знать дням нечего.
	 */
	private _applyStale(): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner) return

		const locale = owner.locale
		const today = todayDate(owner.timeZone)
		const labelKey = `${locale}|${today}`
		const off = owner.disabled
		const bounds = this._bounds

		for (const item of this._ctx.driver.valueOf()) {
			const applied = this._applied.get(item)

			if (applied === undefined) this._applyStyle(item, owner)

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
	private _applyStyle(item: ICalendarItem, owner: ICalendar): void {
		item.size = owner.size
		item.variant = owner.variant
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
