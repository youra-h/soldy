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
import { RESIZE_MAX, RESIZE_MIN, clampWidth } from './width'

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
 * **Ширин у колонки две, итог — одна.** Своя (`width` в пропсах: из данных,
 * от ручки, из кода) делает колонку фиксированной. Без своей колонка гибкая,
 * и её ширину пишет раскладка (`layoutWidth`) — расширение колонок коллекции
 * строк, по месту таблицы и её `columnFit`. Итог отдаёт геттер: своё
 * значение, а без него — ширина раскладки, прижатые к `minWidth` и
 * `maxWidth`. Хранятся обе как заданы, поэтому порядок записи не важен, и
 * своё значение возвращается, когда границы снова его пускают. `change:width`
 * — о смене итога от любого входа: своего значения, раскладки и границ. Нет
 * ни своей ширины, ни раскладки — итога нет: ширину решает тема. Теме итог
 * уходит переменной заголовка (`widthStyle`): формула одна, а не в каждой
 * разметке.
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
 * Ручка работает от итога: пока его нет, ручки нет. `commit` — одно событие на
 * действие и только на смену итога: по нему приложение сохраняет настройку.
 * `resize:start` — тоже одно на действие, но до первой записи: по нему
 * раскладка держит колонки перед этой, пока ширина меняется.
 *
 * Ход ручки (`resizer`) — границы колонки, а на стороне без своей границы —
 * пределы ядра, расширенные до итога. Итог всегда в границах, поэтому лежит и
 * в ходе: нативное поле не прижимает значение к своему ходу, а записанное
 * ручкой всегда равно итогу. Действие, которое итог не меняет, — клавиша у
 * края хода, жест, вернувшийся к точке нажатия, — своего значения не пишет:
 * гибкая колонка остаётся гибкой.
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
	/** Ширина раскладки — пишет расширение колонок; итог считает геттер `width` */
	protected _layoutWidth: number | undefined = undefined
	protected _minWidth: number | undefined
	protected _maxWidth: number | undefined
	protected _align: TTableColumnAlign
	protected _sortable: boolean
	protected _compare: TTableCompare | undefined
	protected _rowHeader: boolean
	protected _resizable: boolean
	protected _reorderable: boolean
	protected _disabled: boolean
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
	 * Итог: своё значение, а без него — ширина раскладки, прижатые к границам.
	 * Нет ни того, ни другого — `undefined`: ширину решает тема.
	 */
	get width(): number | undefined {
		return clampWidth(this._width ?? this._layoutWidth, this._minWidth, this._maxWidth)
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

	get layoutWidth(): number | undefined {
		return this._layoutWidth
	}

	/**
	 * Пишет ширину раскладки. Наружу о ней сообщает итог: сменился он —
	 * `change:width`, у колонки со своей шириной итог от раскладки не зависит.
	 */
	set layoutWidth(value: number | undefined) {
		if (this._layoutWidth === value) return

		this._update(() => {
			this._layoutWidth = value
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
		return this._canResize() && this.width !== undefined
	}

	get resizer(): TTableColumnResizer {
		const width = this.width
		const [min, max] = this._travel(width)

		return { min, max, value: width ?? min }
	}

	get resizerAria(): TAria {
		return this._resizerAria
	}

	get contentAria(): TAria {
		return this._contentAria
	}

	grab(): boolean {
		const width = this.width

		if (!this._canResize() || width === undefined) return false

		// Указатель у ручки один: новый жест закрывает незаконченный
		this.release()

		const [lower, upper] = this._travel(width)

		this._gesture = {
			from: Math.round(width),
			lower,
			upper,
			own: this._width,
			before: width,
			started: false,
		}
		this._setResizing(true)

		return true
	}

	drag(offset: number): void {
		const gesture = this._gesture

		if (!gesture || !this._canResize()) return

		const { from, lower, upper, own } = gesture
		const width = within(Math.round(from + offset), lower, upper)

		if (width !== from && !gesture.started) {
			gesture.started = true
			this._sink.emit('resize:start')
		}

		// Указатель на ширине нажатия — колонка такая, какой была при нажатии, со
		// своим значением: нажатие без движения ширину не задаёт, и гибкая
		// колонка остаётся гибкой
		this.width = width === from ? own : width
	}

	release(): void {
		const gesture = this._gesture

		if (!gesture) return

		this._gesture = undefined
		this._setResizing(false)

		// Жест, вернувшийся к точке нажатия, своего значения не сменил — сохранять
		// нечего, даже если итог за жест сдвинула раскладка
		if (this._width !== gesture.own) this._commit(gesture.before)
	}

	shift(delta: number): void {
		const width = this.width

		if (!this._canResize() || width === undefined) return

		this._resizeToward(width, Math.round(width + delta))
	}

	moveToEdge(edge: TSlideEdge): void {
		const width = this.width

		if (!this._canResize() || width === undefined) return

		// Цель — бесконечно далеко в сторону края: ближе всего к ней край хода
		this._resizeToward(width, edge === 'start' ? -Infinity : Infinity)
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Ручка работает: колонка `resizable` и не выключена. */
	protected _canResize(): boolean {
		return this._resizable && !this._disabled
	}

	/**
	 * Ход ручки от ширины `width` — границы колонки, а на стороне без своей
	 * границы — пределы ядра, не шире границ и расширенные до `width`: там
	 * колонка примет любую. Итог всегда в границах, поэтому лежит и в ходе:
	 * нативное поле не прижимает значение к своему ходу, а записанное ручкой
	 * равно итогу. Нижняя граница сильнее верхней, как у итога.
	 */
	protected _travel(width: number | undefined): [number, number] {
		const min = this._minWidth
		const max = this._maxWidth
		const floor = Math.min(RESIZE_MIN, max ?? RESIZE_MIN)
		const lower = min ?? Math.min(floor, width ?? floor)
		const ceiling = Math.max(RESIZE_MAX, lower)
		const upper = max === undefined ? Math.max(ceiling, width ?? ceiling) : Math.max(max, lower)

		return [lower, upper]
	}

	/**
	 * Законченное действие клавиши от ширины `width` к цели `target`: ширина в
	 * ходе, ближайшая к цели, и `commit`. У края хода ширина та же, и писать
	 * нечего: своё значение не пишется, и гибкая колонка остаётся гибкой.
	 */
	protected _resizeToward(width: number, target: number): void {
		const [lower, upper] = this._travel(width)
		const next = within(target, lower, upper)

		if (next === width) return

		this._sink.emit('resize:start')
		this.width = next
		this._commit(width)
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
	 * Сменить то, от чего зависят итог ширины и ручка: своё значение, ширину
	 * раскладки, границу, `resizable` или `disabled`. Хранимое не прижимается —
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
	 * `data-sized` — ширина колонки известна: своя или раскладки, с первой
	 * отрисовки. Когда она известна у всех показанных колонок, тема кладёт
	 * таблицу шириной в их сумму: иначе раскладка браузера раздала бы излишек
	 * места всем, и ширины колонок разошлись бы с итогом.
	 */
	protected _syncSized(): void {
		this._dataset.add('sized', this.width !== undefined)
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

/** Число в отрезке. */
function within(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/** Поле ручки то же: ход и ширина совпали. */
function sameResizer(a: TTableColumnResizer, b: TTableColumnResizer): boolean {
	return a.min === b.min && a.max === b.max && a.value === b.value
}
