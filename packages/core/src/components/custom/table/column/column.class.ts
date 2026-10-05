import { TComponentView } from '../../../base/component-view'
import type { TDefaultValues } from '../../../base/component'
import type { TEventSink } from '../../../../common'
import type {
	ITableColumn,
	ITableColumnProps,
	TTableColumnAlign,
	TTableColumnEvents,
} from './types'

/**
 * Колонка таблицы — элемент коллекции колонок: ось, по которой строки
 * раскладываются в ячейки.
 *
 * Колонка — экземпляр, а заголовок — его отрисовка: корень колонки — ячейка
 * шапки, `th`. Своего `disabled` у заголовка нет, поэтому база — визуальный
 * слой, а не контрол.
 *
 * Своё у колонки — поле записи (`field`), заголовок, ширина с границами и
 * выравнивание. О строках и о коллекции она не знает: место колонки в
 * коллекции отдаёт её фасад, а какие колонки показаны — коллекция.
 *
 * **Ширина хранится как задана**, итог отдаёт геттер — своё значение, прижатое
 * к `minWidth` и `maxWidth`. Поэтому порядок записи не важен, и своё значение
 * возвращается, когда границы снова его пускают. `change:width` — о смене
 * итога: и от своего значения, и от границ.
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
			'field' | 'text' | 'align',
			'width' | 'minWidth' | 'maxWidth'
		> = {
		...TComponentView.defaultValues,
		tag: 'th',
		field: '',
		text: '',
		align: 'start',
		width: undefined,
		minWidth: undefined,
		maxWidth: undefined,
	}

	protected _field: string
	protected _text: string
	/** Своя ширина — как задана; итог считает геттер `width` */
	protected _width: number | undefined
	protected _minWidth: number | undefined
	protected _maxWidth: number | undefined
	protected _align: TTableColumnAlign

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTableColumn

		this._field = props.field ?? ctor.defaultValues.field
		this._text = props.text ?? ctor.defaultValues.text
		this._width = props.width ?? ctor.defaultValues.width
		this._minWidth = props.minWidth ?? ctor.defaultValues.minWidth
		this._maxWidth = props.maxWidth ?? ctor.defaultValues.maxWidth
		this._align = props.align ?? ctor.defaultValues.align

		this._syncAlign()
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

		this._resize(() => {
			this._width = value
		})
	}

	get minWidth(): number | undefined {
		return this._minWidth
	}

	set minWidth(value: number | undefined) {
		if (this._minWidth === value) return

		this._resize(() => {
			this._minWidth = value
		})
		this._sink.emit('change:minWidth', value)
	}

	get maxWidth(): number | undefined {
		return this._maxWidth
	}

	set maxWidth(value: number | undefined) {
		if (this._maxWidth === value) return

		this._resize(() => {
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

	/**
	 * Сменить своё значение или границу. Хранимое не прижимается —
	 * пересчитывается итог, и `change:width` приходит, только если он сменился.
	 */
	protected _resize(apply: () => void): void {
		const before = this.width

		apply()

		const after = this.width

		if (after !== before) this._sink.emit('change:width', after)
	}

	/** `data-align` — выравнивание для темы, с первой отрисовки. */
	protected _syncAlign(): void {
		this._dataset.add('align', this._align)
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
