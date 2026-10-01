import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
import { clampDate, parseDate } from '../../../../../../common'
import type { TCalendarDate } from '../../../../../../common'
import { calendarBounds, datesOf, inBounds } from '../../../dates'
import type { TCalendarBounds } from '../../../dates'
import type { ICalendarItem } from '../../../item/types'
import type { TCalendarUnavailable, TCalendarValue } from '../../../types'
import { focusOf } from '../guards'
import type { TCalendarEngineOptions } from '../view'
import { TMultipleSelection, TRangeSelection, TSingleSelection } from './strategies'
import type { ICalendarSelection, TCalendarMarker, TCalendarSelectionCtor } from './strategies'
import { TCalendarSelectionItemExtension } from './item'
import type {
	ICalendarSelectionExtension,
	ICalendarSelectionItemExtension,
	TCalendarMode,
	TCalendarSelectionEvents,
} from './types'

/** Стратегия выбора на режим — её заводит сеттер `mode`. */
const STRATEGIES: Readonly<Record<TCalendarMode, TCalendarSelectionCtor>> = {
	single: TSingleSelection,
	multiple: TMultipleSelection,
	range: TRangeSelection,
}

/**
 * Выбор календаря: одна дата, несколько или диапазон.
 *
 * Календарь — опция движка (`owner`): он приходит и уходит после сборки, и
 * выбор наблюдает его (`ctx.options.watch`). Без календаря значения нет и
 * выбирать нечего.
 *
 * **Выбор — даты, а не элементы.** Значение живёт у календаря (`value`) и
 * может называть дни, которых в коллекции нет: другой месяц, другой год,
 * середину диапазона между январём и сентябрём. Дням на экране расширение
 * пишет, выбраны ли они, по правилу «лежит ли дата дня в выборе».
 *
 * **Режим — стратегия** (`strategies/`), её меняет сеттер `mode`, и веток по
 * режиму в методах нет. Смена режима переписывает значение календаря в форму
 * нового режима — так же, как выбор пользователя пишет его в форме текущего.
 * Запись значения снаружи расширение не переписывает: какие даты из неё
 * выбраны, решает режим.
 *
 * **Диапазон — в два шага.** Первый выбор ставит якорь и значения не трогает,
 * второй пишет пару. Пока якорь стоит, дни показывают предпросмотр — от якоря
 * до дня под указателем, без указателя — до фокуса.
 *
 * **Что день знает от выбора:** `aria-selected` (и `false`), `data-selected`,
 * `data-range-start`, `data-range-end`, `data-range-middle`, `data-preview` и
 * `unavailable` дня — по правилу календаря с якорем. Пишет
 * родительское расширение, а не item-адаптер: адаптеры создаются лениво, а
 * отметки нужны с первой отрисовки.
 */
export class TCalendarSelectionExtension
	extends TBaseOwnerItemExtension<
		ICalendarItem,
		ICalendarSelectionItemExtension,
		TCalendarSelectionEvents,
		TCalendarEngineOptions
	>
	implements ICalendarSelectionExtension
{
	readonly name = 'selection' as const

	private _mode: TCalendarMode = 'single'
	private _strategy: ICalendarSelection = new TSingleSelection()
	private _anchor: TCalendarDate | undefined = undefined
	private _hovered: TCalendarDate | undefined = undefined
	/** Значение пишет сам выбор — это не запись снаружи */
	private _writing = false
	/** Последние отметки и то, из чего они посчитаны */
	private _memo: { key: TMarkerKey; marker: TCalendarMarker } | undefined = undefined
	/** По каким правилу и якорю дню посчитано «недоступен» */
	private readonly _bound = new WeakMap<
		ICalendarItem,
		{ rule: TCalendarUnavailable | undefined; anchor: TCalendarDate | undefined }
	>()

	constructor(
		options?: IBaseOwnerItemExtensionOptions<ICalendarItem, ICalendarSelectionItemExtension>,
	) {
		super(TCalendarSelectionItemExtension, options)
	}

	get mode(): TCalendarMode {
		return this._mode
	}

	set mode(value: TCalendarMode) {
		if (this._mode === value) return

		this._mode = value
		this._strategy = new STRATEGIES[value]()
		this._setAnchor(undefined)

		// Значение — в форму нового режима
		this._write(this.value)

		this.events.emit('change:mode', value)
		this._paintAll()
	}

	get multiselectable(): boolean {
		return this._strategy.multiselectable
	}

	get value(): TCalendarValue {
		return this._strategy.resolve(datesOf(this._ctx?.options.get('owner')?.value))
	}

	get anchor(): TCalendarDate | undefined {
		return this._anchor
	}

	get hovered(): TCalendarDate | undefined {
		return this._hovered
	}

	override install(ctx: IExtensionContext<ICalendarItem, TCalendarEngineOptions>): void {
		super.install(ctx)

		// Дни пришли — их «недоступен» и отметки. На весь состав: при листании
		// новые дни приходят пачкой, и итог `change:items` один. Резольвер
		// ставится только тем, у кого его нет или он устарел: оставшимся на
		// экране днях функция потребителя повторно не зовётся
		ctx.driver.events.on('change:items', () => {
			this._bindStale()
			this._paintAll()
		})

		// Догон: дни могли лечь в коллекцию раньше расширения
		this._bindStale()

		// Предпросмотр идёт до фокуса, пока указателя нет
		focusOf(ctx)?.events.on('change:focusedDate', () => {
			if (this._anchor !== undefined && this._hovered === undefined) this._paintAll()
		})

		this._paintAll()

		// Календарь — опция движка: приходит и уходит после сборки. Подписки на
		// него живут в области наблюдателя — сменился календарь, прежние сняты
		ctx.options.watch('owner', (owner, scope) => {
			if (!owner) return

			// Начатый диапазон — прежнего календаря. «Недоступен» и отметки — по
			// правилу и значению нового
			this._setAnchor(undefined)
			this._bindStale()
			this._paintAll()

			scope.on(owner.events, 'change:value', () => this._onValue())
			scope.on(owner.events, 'change:unavailable', () => this._bindStale())
		})
	}

	isSelected(date: TCalendarDate): boolean {
		return this._marker()(date).selected
	}

	/**
	 * Недоступный день и день вне границ не выбираются. Недоступен ли день,
	 * решает `unavailable` с якорем начатого диапазона — у второго конца он
	 * уже стоит.
	 */
	chooseDate(date: TCalendarDate): boolean {
		const owner = this._ctx.options.get('owner')
		const chosen = parseDate(date)

		if (!owner || owner.disabled || chosen === undefined || !this._selectable(chosen)) {
			return false
		}

		const choice = this._strategy.choose(chosen, {
			raw: owner.value,
			dates: datesOf(this.value),
			anchor: this._anchor,
		})

		// Значение — последним: к `change:value` якорь и фокус уже на месте
		this._setAnchor(choice.anchor)
		focusOf(this._ctx)?.focusDate(chosen)
		this._write(choice.value)
		this._paintAll()

		return true
	}

	cancelRange(): void {
		if (this._ctx.options.get('owner')?.disabled ?? true) return

		this._setAnchor(undefined)
	}

	/**
	 * Сообщение, а не команда: где указатель, календарь узнаёт и выключенным.
	 * Не дата — как `undefined`.
	 */
	notifyHover(date: TCalendarDate | undefined): void {
		const hovered = parseDate(date)

		if (this._hovered === hovered) return

		this._hovered = hovered
		this.events.emit('change:hovered', hovered)

		if (this._anchor !== undefined) this._paintAll()
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Значение записали снаружи. Сменился выбор — якорь начатого диапазона
	 * снят, а фокус переходит на первую выбранную дату. Пустое значение
	 * фокус не трогает.
	 */
	private _onValue(): void {
		if (this._writing) return

		this._setAnchor(undefined)

		const first = datesOf(this.value)[0]

		if (first !== undefined) focusOf(this._ctx)?.focusDate(first)

		this._paintAll()
	}

	/** Значение пишется календарю. Календаря нет — писать некуда. */
	private _write(value: TCalendarValue): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner) return

		this._writing = true

		try {
			owner.value = value
		} finally {
			this._writing = false
		}
	}

	private _setAnchor(value: TCalendarDate | undefined): void {
		if (this._anchor === value) return

		this._anchor = value
		this.events.emit('change:anchor', value)

		// «Недоступен» зависит от якоря: функция потребителя его получает
		this._bindStale()
		this._paintAll()
	}

	/** Границы календаря. Календаря нет — границ тоже. */
	private get _bounds(): TCalendarBounds {
		const owner = this._ctx.options.get('owner')

		return calendarBounds(owner?.min, owner?.max)
	}

	/** Можно ли выбрать день: в границах и доступен. */
	private _selectable(date: TCalendarDate): boolean {
		const rule = this._ctx.options.get('owner')?.unavailable

		return inBounds(date, this._bounds) && !rule?.(date, this._anchor)
	}

	/**
	 * Отметки дней: второй конец предпросмотра — день под указателем, без него
	 * — фокус, в границах.
	 *
	 * Запоминается по всему, от чего зависит: значению (по ссылке — календарь
	 * хранит его как задано, и новая запись — новая ссылка), стратегии, якорю,
	 * второму концу и границам. Геттер `selected` читают у каждого дня, и без
	 * памяти каждое чтение заново разбирало и сортировало значение. Ключ —
	 * сами данные, а не флаг «устарело»: забытый сброс флага показал бы
	 * прежний выбор, а ключ такого не допускает.
	 */
	private _marker(): TCalendarMarker {
		const bounds = this._bounds
		const focused = focusOf(this._ctx)?.focusedDate
		const end = this._hovered ?? focused ?? this._anchor
		const key: TMarkerKey = {
			value: this._ctx.options.get('owner')?.value,
			strategy: this._strategy,
			anchor: this._anchor,
			end: end === undefined ? bounds.low : clampDate(end, bounds.low, bounds.high),
		}

		if (this._memo && sameMarkerKey(this._memo.key, key)) return this._memo.marker

		const marker = this._strategy.marker(datesOf(key.value), key.anchor, key.end)

		this._memo = { key, marker }

		return marker
	}

	/** Отметки на весь состав коллекции. */
	private _paintAll(): void {
		if (!this._ctx) return

		const marker = this._marker()

		for (const item of this._ctx.driver.valueOf()) {
			const marks = marker(item.date)

			item.aria.add('aria-selected', String(marks.selected))
			item.dataset.add('selected', marks.selected)
			item.dataset.add('range-start', marks.rangeStart)
			item.dataset.add('range-end', marks.rangeEnd)
			item.dataset.add('range-middle', marks.rangeMiddle)
			item.dataset.add('preview', marks.preview)
		}

		this.events.emit('change:marks')
	}

	/**
	 * «Недоступен» тем дням, у кого он ещё не посчитан или посчитан по
	 * прежним правилу и якорю. Дни, оставшиеся на экране при листании, его
	 * сохраняют, и функцию потребителя для них повторно не зовут.
	 */
	private _bindStale(): void {
		if (!this._ctx) return

		const rule = this._ctx.options.get('owner')?.unavailable
		const anchor = this._anchor

		for (const item of this._ctx.driver.valueOf()) {
			const bound = this._bound.get(item)

			if (bound !== undefined && bound.rule === rule && bound.anchor === anchor) continue

			this._bound.set(item, { rule, anchor })
			this._bindUnavailable(item, rule, anchor)
		}
	}

	/**
	 * «Недоступен» дня — правило календаря с якорем. Сеттер дня сверяет со
	 * старым сам: событие приходит только тем дням, у кого значение сменилось.
	 */
	private _bindUnavailable(
		item: ICalendarItem,
		rule: TCalendarUnavailable | undefined,
		anchor: TCalendarDate | undefined,
	): void {
		item.unavailable = Boolean(rule?.(item.date, anchor))
	}
}

/** От чего зависят отметки дней. */
type TMarkerKey = {
	value: TCalendarValue
	strategy: ICalendarSelection
	anchor: TCalendarDate | undefined
	end: TCalendarDate
}

function sameMarkerKey(a: TMarkerKey, b: TMarkerKey): boolean {
	return (
		a.value === b.value && a.strategy === b.strategy && a.anchor === b.anchor && a.end === b.end
	)
}
