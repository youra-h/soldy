import { TComponentView } from '../../../base/component-view'
import type { TDefaultValues } from '../../../base/component'
import { TAria } from '../../../../common'
import type { TEventSink } from '../../../../common'
import type { TSlideEdge } from '../../slide'
import type {
	ITableColumn,
	ITableColumnProps,
	TTableColumnAlign,
	TTableColumnEvents,
	TTableColumnGesture,
	TTableColumnResizer,
	TTableColumnStyle,
	TTableCompare,
} from './types'

/**
 * Пределы ручки ширины, px, — когда своих границ у колонки нет.
 *
 * Ручке нужен ход: её поле — `input type="range"` с `min` и `max`, а Home и End
 * ведут к его краям. Уже нижнего предела колонка перестаёт быть колонкой: в
 * ней не остаётся места ни подписи, ни ручке у её края. Верхний — заведомо
 * шире любой осмысленной колонки, но конечный: End не уводит ширину в
 * бесконечность. Своё место у колонки потребитель задаёт границами.
 */
const RESIZE_MIN = 48
const RESIZE_MAX = 1600

/**
 * Колонка таблицы — элемент коллекции колонок: ось, по которой строки
 * раскладываются в ячейки.
 *
 * Колонка — экземпляр, а заголовок — его отрисовка: корень колонки — ячейка
 * шапки, `th`. База — визуальный слой, а не контрол: нажатия, фокуса и имени
 * у заголовка нет, а `disabled` нужен колонке только для ручки — его пишет
 * таблица.
 *
 * Своё у колонки — поле записи (`field`), заголовок, ширина с границами,
 * выравнивание, сортируемость, своё сравнение записей и признак заголовка
 * строки (`rowHeader`: ячейки колонки называют свои строки). О строках и о
 * коллекции она не знает: место колонки в коллекции отдаёт её фасад, какие
 * колонки показаны — коллекция, а отсортированы ли строки по колонке —
 * расширение сортировки коллекции строк, оно же пишет это в её наборы.
 *
 * **Ширина хранится как задана**, итог отдаёт геттер — своё значение, прижатое
 * к `minWidth` и `maxWidth`. Поэтому порядок записи не важен, и своё значение
 * возвращается, когда границы снова его пускают. `change:width` — о смене
 * итога: и от своего значения, и от границ. Теме итог уходит переменной
 * заголовка (`widthStyle`): формула одна, а не в каждой разметке.
 *
 * **Перестановка** (`reorderable`) — колонку берут за заголовок и переносят на
 * другое место среди показанных. Место колонки знает коллекция колонок, а не
 * она, поэтому жест и команда перестановки — у расширения `columns`
 * коллекции строк; колонка только разрешает себя взять и сообщает это теме
 * (`data-reorderable`).
 *
 * **Ручка ширины** (`resizable`) — поле у края заголовка. Границы слоёв те же,
 * что у Slider: **значение — здесь, операция — в плагине.** Жест и клавиши
 * приходят командами (`grab`, `drag`, `release`, `shift`, `moveToEdge`): где
 * указатель и какая клавиша, знает плагин, а какой станет ширина — колонка.
 * Ширину колонки без своей ширины решает тема, и её колонке сообщает замер
 * плагина (`notifyWidth`): замеров в ядре нет. `commit` — одно событие на
 * действие и только на смену итога: по нему приложение сохраняет настройку.
 *
 * Ходов у ручки два. **Ход записи** — в нём ручка пишет своё значение ширины:
 * границы колонки, а на стороне без своей границы — пределы ядра, расширенные
 * до известной ширины. Ширину за границами колонка не примет, поэтому
 * записанное ручкой всегда равно итогу. **Ход поля** (`resizer`) — ход
 * записи, расширенный до известной ширины: нативное поле прижало бы значение
 * к своему ходу и показало бы не ту ширину.
 *
 * Колонку без своей ширины тема раскладывает, не глядя на границы, и её
 * ширина бывает вне хода записи — за своей границей. **Ручка не двигает
 * ширину против действия**: действие к ходу пишет ширину в нём, ближайшую к
 * цели, — скачок к границе идёт в сторону действия, — а действие от хода
 * ничего не пишет. В жесте указатель на точке нажатия или дальше неё от хода
 * возвращает колонке своё значение, каким оно было при нажатии.
 */
export default class TTableColumn<
	TProps extends ITableColumnProps = ITableColumnProps,
	TEvents extends TTableColumnEvents = TTableColumnEvents,
>
	extends TComponentView<TProps, TEvents>
	implements ITableColumn<TProps, TEvents>
{
	static override baseClass = 's-table-column'

	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<
			ITableColumnProps,
			| 'field'
			| 'text'
			| 'align'
			| 'sortable'
			| 'rowHeader'
			| 'resizable'
			| 'reorderable'
			| 'disabled',
			'width' | 'minWidth' | 'maxWidth' | 'compare'
		> = {
		...TComponentView.defaultValues,
		tag: 'th',
		field: '',
		text: '',
		align: 'start',
		width: undefined,
		minWidth: undefined,
		maxWidth: undefined,
		// Кнопка сортировки в заголовке — решение потребителя
		sortable: false,
		compare: undefined,
		// Какая колонка называет строки, знает только потребитель
		rowHeader: false,
		// Ручка ширины — тоже решение потребителя
		resizable: false,
		// Перестановка за заголовок — тоже
		reorderable: false,
		disabled: false,
	}

	protected _field: string
	protected _text: string
	/** Своя ширина — как задана; итог считает геттер `width` */
	protected _width: number | undefined
	protected _minWidth: number | undefined
	protected _maxWidth: number | undefined
	protected _align: TTableColumnAlign
	protected _sortable: boolean
	protected _compare: TTableCompare | undefined
	protected _rowHeader: boolean
	protected _resizable: boolean
	protected _reorderable: boolean
	protected _disabled: boolean
	/** Последний замер плагина — ширина колонки, которую решила тема */
	protected _measuredWidth: number | undefined = undefined
	protected _gesture: TTableColumnGesture | undefined = undefined
	protected _resizerAria: TAria
	protected _contentAria: TAria

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTableColumn

		this._field = props.field ?? ctor.defaultValues.field
		this._text = props.text ?? ctor.defaultValues.text
		this._width = props.width ?? ctor.defaultValues.width
		this._minWidth = props.minWidth ?? ctor.defaultValues.minWidth
		this._maxWidth = props.maxWidth ?? ctor.defaultValues.maxWidth
		this._align = props.align ?? ctor.defaultValues.align
		this._sortable = props.sortable ?? ctor.defaultValues.sortable
		this._compare = props.compare ?? ctor.defaultValues.compare
		this._rowHeader = props.rowHeader ?? ctor.defaultValues.rowHeader
		this._resizable = props.resizable ?? ctor.defaultValues.resizable
		this._reorderable = props.reorderable ?? ctor.defaultValues.reorderable
		this._disabled = props.disabled ?? ctor.defaultValues.disabled

		this._resizerAria = new TAria()
		this._resizerAria.events.on('change', () =>
			this._sink.emit('change:resizerAria', this._resizerAria.toObject()),
		)

		this._contentAria = new TAria()
		this._contentAria.events.on('change', () =>
			this._sink.emit('change:contentAria', this._contentAria.toObject()),
		)

		this._syncAlign()
		this._syncSized()
		this._syncReorderable()

		this.events.on('change:tag', () => this._syncScope())
		this._syncScope()

		// С первой отрисовки и значением `"false"`: тема отличает «не тянут»
		// от «неприменимо»
		this._dataset.add('resizing', false)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTableColumnEvents> {
		return this.events
	}

	get field(): string {
		return this._field
	}

	set field(value: string) {
		if (this._field === value) return

		this._field = value
		this._sink.emit('change:field', value)
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (this._text === value) return

		this._text = value
		this._sink.emit('change:text', value)
	}

	/**
	 * Итог: своё значение, прижатое к границам. Своего нет — `undefined`, и
	 * границы ни на что не влияют: ширину решает тема.
	 */
	get width(): number | undefined {
		return clamp(this._width, this._minWidth, this._maxWidth)
	}

	/**
	 * Пишет своё значение. Сверка — со своим, а не с итогом: своё, равное итогу,
	 * но не своему, обязано записаться — границы потом разойдутся, и итогом
	 * станет оно.
	 */
	set width(value: number | undefined) {
		if (this._width === value) return

		this._update(() => {
			this._width = value
		})
	}

	get minWidth(): number | undefined {
		return this._minWidth
	}

	set minWidth(value: number | undefined) {
		if (this._minWidth === value) return

		this._update(() => {
			this._minWidth = value
		})
		this._sink.emit('change:minWidth', value)
	}

	get maxWidth(): number | undefined {
		return this._maxWidth
	}

	set maxWidth(value: number | undefined) {
		if (this._maxWidth === value) return

		this._update(() => {
			this._maxWidth = value
		})
		this._sink.emit('change:maxWidth', value)
	}

	get align(): TTableColumnAlign {
		return this._align
	}

	set align(value: TTableColumnAlign) {
		if (this._align === value) return

		this._align = value
		this._syncAlign()
		this._sink.emit('change:align', value)
	}

	get sortable(): boolean {
		return this._sortable
	}

	set sortable(value: boolean) {
		if (this._sortable === value) return

		this._sortable = value
		this._sink.emit('change:sortable', value)
	}

	get compare(): TTableCompare | undefined {
		return this._compare
	}

	/** Функция сверяется по ссылке: новая функция — новое сравнение. */
	set compare(value: TTableCompare | undefined) {
		if (this._compare === value) return

		this._compare = value
		this._sink.emit('change:compare', value)
	}

	get rowHeader(): boolean {
		return this._rowHeader
	}

	set rowHeader(value: boolean) {
		if (this._rowHeader === value) return

		this._rowHeader = value
		this._sink.emit('change:rowHeader', value)
	}

	get resizable(): boolean {
		return this._resizable
	}

	set resizable(value: boolean) {
		if (this._resizable === value) return

		this._update(() => {
			this._resizable = value
		})
		this._sink.emit('change:resizable', value)
	}

	get reorderable(): boolean {
		return this._reorderable
	}

	set reorderable(value: boolean) {
		if (this._reorderable === value) return

		this._reorderable = value
		this._syncReorderable()
		this._sink.emit('change:reorderable', value)
	}

	get disabled(): boolean {
		return this._disabled
	}

	set disabled(value: boolean) {
		if (this._disabled === value) return

		this._update(() => {
			this._disabled = value
		})
		this._sink.emit('change:disabled', value)
	}

	/**
	 * `--s-table-column-width` — итог ширины в px. Без ширины переменной нет:
	 * ширину колонки решает тема. Считает ядро, а не разметка: в шести
	 * адаптерах одна формула была бы шесть раз.
	 */
	get widthStyle(): TTableColumnStyle {
		const width = this.width

		return width === undefined ? {} : { '--s-table-column-width': `${width}px` }
	}

	/* ------------------------------------------------------------------ */
	/* Ручка ширины                                                       */
	/* ------------------------------------------------------------------ */

	get resizerRendered(): boolean {
		return this._canResize() && this._knownWidth !== undefined
	}

	get resizer(): TTableColumnResizer {
		const known = this._knownWidth
		const [min, max] = this._fieldTravel(known)

		return { min, max, value: known ?? min }
	}

	get resizerAria(): TAria {
		return this._resizerAria
	}

	get contentAria(): TAria {
		return this._contentAria
	}

	grab(width: number): boolean {
		if (!this._canResize()) return false

		// Указатель у ручки один: новый жест закрывает незаконченный
		this.release()

		const from = Math.round(width)
		const [lower, upper] = this._travel(from)

		this._gesture = { from, lower, upper, own: this._width, before: this.width, moved: false }
		this._setResizing(true)

		return true
	}

	drag(offset: number): void {
		const gesture = this._gesture

		if (!gesture || !this._canResize()) return

		// До первого сдвига жест — ещё нажатие: ширину оно не задаёт, и колонка
		// без своей ширины остаётся за темой
		if (!gesture.moved && offset === 0) return

		gesture.moved = true

		const { from, lower, upper } = gesture

		// Ширина нажатия за своей границей, а указатель на точке нажатия или
		// дальше неё от хода — колонка такая, какой была при нажатии
		this.width = reach(from, Math.round(from + offset), lower, upper) ?? gesture.own
	}

	release(): void {
		const gesture = this._gesture

		if (!gesture) return

		this._gesture = undefined
		this._setResizing(false)
		this._commit(gesture.before)
	}

	shift(delta: number): void {
		const known = this._knownWidth

		if (!this._canResize() || known === undefined) return

		this._resizeToward(known, Math.round(known + delta))
	}

	moveToEdge(edge: TSlideEdge): void {
		const known = this._knownWidth

		if (!this._canResize() || known === undefined) return

		// Цель — бесконечно далеко в сторону края: ближе всего к ней край хода
		this._resizeToward(known, edge === 'start' ? -Infinity : Infinity)
	}

	notifyWidth(width: number): void {
		const measured = width > 0 ? Math.round(width) : undefined

		if (this._measuredWidth === measured) return

		this._update(() => {
			this._measuredWidth = measured
		})
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Ручка работает: колонка `resizable` и не выключена. */
	protected _canResize(): boolean {
		return this._resizable && !this._disabled
	}

	/** Ширина, которую показывает поле ручки: итог, а без своей — замер. */
	protected get _knownWidth(): number | undefined {
		return this.width ?? this._measuredWidth
	}

	/**
	 * Ход записи — ширины, которые ручка пишет от известной ширины `known`:
	 * границы колонки, а на стороне без своей границы — пределы ядра, не шире
	 * границ и расширенные до `known`: там колонка примет любую. Своя граница
	 * не расширяется — ширину за ней итог прижал бы, — поэтому записанное
	 * ручкой всегда равно итогу, а `known` вне хода бывает только за своей
	 * границей. Нижняя граница сильнее верхней, как у итога.
	 */
	protected _travel(known: number | undefined): [number, number] {
		const min = this._minWidth
		const max = this._maxWidth
		const floor = Math.min(RESIZE_MIN, max ?? RESIZE_MIN)
		const lower = min ?? Math.min(floor, known ?? floor)
		const ceiling = Math.max(RESIZE_MAX, lower)
		const upper = max === undefined ? Math.max(ceiling, known ?? ceiling) : Math.max(max, lower)

		return [lower, upper]
	}

	/**
	 * Ход поля ручки — ход записи, расширенный до известной ширины `known`:
	 * ширина лежит в ходе поля всегда, иначе нативное поле прижало бы `value` к
	 * своему ходу и показало бы не ту ширину. У колонки, которую тема разложила
	 * за её границей, ход поля шире хода записи.
	 */
	protected _fieldTravel(known: number | undefined): [number, number] {
		const [lower, upper] = this._travel(known)

		if (known === undefined) return [lower, upper]

		return [Math.min(lower, known), Math.max(upper, known)]
	}

	/**
	 * Законченное действие клавиши от ширины `known` к цели `target`: ширина в
	 * ходе записи, ближайшая к цели, и `commit`, если итог сменился. Против
	 * действия ручка ширину не двигает: действие от хода ничего не пишет.
	 */
	protected _resizeToward(known: number, target: number): void {
		const [lower, upper] = this._travel(known)
		const width = reach(known, target, lower, upper)

		if (width === undefined) return

		const before = this.width

		this.width = width
		this._commit(before)
	}

	/** `commit` — только на смену итога. */
	protected _commit(before: number | undefined): void {
		const after = this.width

		if (after === undefined || after === before) return

		this._sink.emit('commit', after)
	}

	/** `data-resizing` — идёт жест ручки: тема держит курсор ручки на всей таблице. */
	protected _setResizing(value: boolean): void {
		this._dataset.add('resizing', value)
	}

	/**
	 * Сменить то, от чего зависят итог ширины и ручка: своё значение, границу,
	 * замер, `resizable` или `disabled`. Хранимое не прижимается —
	 * пересчитываются итог и выходы ручки, и каждое событие приходит, только
	 * если его значение сменилось.
	 */
	protected _update(apply: () => void): void {
		const width = this.width
		const resizer = this.resizer
		const rendered = this.resizerRendered

		apply()

		this._syncSized()

		const nextWidth = this.width
		const nextResizer = this.resizer
		const nextRendered = this.resizerRendered

		if (nextWidth !== width) this._sink.emit('change:width', nextWidth)
		if (!sameResizer(nextResizer, resizer)) this._sink.emit('change:resizer', nextResizer)
		if (nextRendered !== rendered) this._sink.emit('change:resizerRendered', nextRendered)
	}

	/**
	 * `data-reorderable` — колонку можно взять за заголовок, с первой отрисовки:
	 * тема подсвечивает такой заголовок под указателем и отдаёт его жесту
	 * касания. Выключенную таблицу тема различает сама — по корню.
	 */
	protected _syncReorderable(): void {
		this._dataset.add('reorderable', this._reorderable)
	}

	/** `data-align` — выравнивание для темы, с первой отрисовки. */
	protected _syncAlign(): void {
		this._dataset.add('align', this._align)
	}

	/**
	 * `scope="col"` — пока корень `th`: заголовок колонки объявлен явно, а не
	 * догадкой по месту ячейки в таблице. Нативный атрибут тега, поэтому — в
	 * `attrs` и по тегу, как `disabled` у контрола: у другого тега его нет.
	 */
	protected _syncScope(): void {
		this._attrs.add('scope', this.tag === 'th' ? 'col' : null)
	}

	/**
	 * `data-sized` — у колонки своя ширина, с первой отрисовки. Когда она есть у
	 * всех показанных колонок, тема кладёт таблицу шириной в их сумму: иначе
	 * раскладка раздала бы излишек места всем, и ручка не держала бы колонку.
	 */
	protected _syncSized(): void {
		this._dataset.add('sized', this._width !== undefined)
	}

	/** Пропсы — свои значения, как заданы: ширина в них своя, а не итог. */
	override getProps(): TProps {
		return {
			...super.getProps(),
			field: this._field,
			text: this._text,
			width: this._width,
			minWidth: this._minWidth,
			maxWidth: this._maxWidth,
			align: this._align,
			sortable: this._sortable,
			compare: this._compare,
			rowHeader: this._rowHeader,
			resizable: this._resizable,
			reorderable: this._reorderable,
			disabled: this._disabled,
		} as TProps
	}
}

/**
 * Ширина в границах. Нижняя граница сильнее верхней, как `min-width` в CSS:
 * при `minWidth` больше `maxWidth` итог — `minWidth`.
 */
function clamp(
	width: number | undefined,
	min: number | undefined,
	max: number | undefined,
): number | undefined {
	if (width === undefined) return undefined

	const capped = max === undefined ? width : Math.min(width, max)

	return min === undefined ? capped : Math.max(capped, min)
}

/** Число в отрезке. */
function within(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/**
 * Ширина, которую ручка пишет на действие от ширины `from` к цели `target`, —
 * ближайшая к цели в ходе записи `[low, high]`, если она не против действия:
 * ширина сдвигается в сторону цели или остаётся на месте. Ширина в ходе так
 * пишется всегда. Ширина вне хода лежит за своей границей, и ход — по одну
 * сторону от неё: действие к ходу пишет ширину в нём, а действие от хода и
 * действие без сдвига — `undefined`, писать нечего.
 */
function reach(from: number, target: number, low: number, high: number): number | undefined {
	const width = within(target, low, high)
	const step = Math.sign(width - from)

	return step === 0 || step === Math.sign(target - from) ? width : undefined
}

/** Поле ручки то же: ход и ширина совпали. */
function sameResizer(a: TTableColumnResizer, b: TTableColumnResizer): boolean {
	return a.min === b.min && a.max === b.max && a.value === b.value
}
