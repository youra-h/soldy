import { TInputControl } from '../../base/input-control'
import type { TDefaultValues } from '../../base/component'
import { TAria } from '../../../common'
import type { ITextarea, ITextareaProps, TTextareaEvents, TTextareaLimit } from './types'

/** Перевод строки в любой записи: CR LF и одиночный CR браузер считает одним LF. */
const LINE_BREAK = /\r\n?/g

/**
 * Многострочное поле — нативная `<textarea>` внутри корня, семья Input:
 * значение, `name`, `id`, выключенность, только чтение, обязательность,
 * плейсхолдер, размер, вариант и ошибка `invalid` от поля формы `Field`.
 * Кнопки очистки и боковых слотов Input у него нет, поэтому база —
 * `TInputControl`, а не `TClearable`.
 *
 * Своё сверх Input — то, чего нативная `<textarea>` не умеет, включается
 * флагом, а нативное остаётся нативным:
 *
 * - `rows` и `maxlength` — атрибуты поля, их проводит разметка;
 * - авторост (`autoresize`, потолок `maxRows`) — операция над узлом: высоту
 *   по содержимому мерит и пишет плагин автороста, ядро только хранит
 *   свойства;
 * - счётчик (`counter`) — его текст строка языка («12 / 200»), её пишет плагин
 *   имён; ядро считает набранное (`textLength`), ставит `data-limit` и держит
 *   набор счётчика (`counterAria`), а `id` в него и ссылку поля на счётчик
 *   пишет плагин связок.
 *
 * Границы слоёв: **значение — здесь, операция — в плагине.**
 */
export default class TTextarea
	extends TInputControl<string, ITextareaProps, TTextareaEvents>
	implements ITextarea
{
	static override baseClass = 'so-textarea'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<
			ITextareaProps,
			'placeholder' | 'rows' | 'maxRows' | 'autoresize' | 'counter',
			'maxlength'
		> = {
		...TInputControl.defaultValues,
		// Текст поля — всегда строка: пустое поле — пустая строка, и набранное
		// считается без проверки на «значения нет»
		value: '',
		placeholder: '',
		// Как у браузера: `<textarea>` без `rows` — две строки
		rows: 2,
		maxRows: 0,
		maxlength: undefined,
		autoresize: false,
		counter: false,
	}

	protected _placeholder: string
	protected _rows: number
	protected _maxRows: number
	protected _maxlength: number | undefined
	protected _autoresize: boolean
	protected _counter: boolean
	protected readonly _counterAria: TAria

	constructor(props: Partial<ITextareaProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTextarea

		this._placeholder = props.placeholder ?? ctor.defaultValues.placeholder
		this._rows = props.rows ?? ctor.defaultValues.rows
		this._maxRows = props.maxRows ?? ctor.defaultValues.maxRows
		this._maxlength = props.maxlength ?? ctor.defaultValues.maxlength
		this._autoresize = props.autoresize ?? ctor.defaultValues.autoresize
		this._counter = props.counter ?? ctor.defaultValues.counter

		this._counterAria = new TAria()

		this._counterAria.events.on('change', () =>
			this.events.emit('change:counterAria', this._counterAria.toObject()),
		)

		this.events.on('change:value', () => this._syncLimit())
		this.events.on('change:maxlength', () => this._syncLimit())

		this._syncLimit()
	}

	get placeholder(): string {
		return this._placeholder
	}

	set placeholder(value: string) {
		if (this._placeholder === value) return

		this._placeholder = value
		this.events.emit('change:placeholder', value)
	}

	get rows(): number {
		return this._rows
	}

	set rows(value: number) {
		if (this._rows === value) return

		this._rows = value
		this.events.emit('change:rows', value)
	}

	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows === value) return

		this._maxRows = value
		this.events.emit('change:maxRows', value)
	}

	get maxlength(): number | undefined {
		return this._maxlength
	}

	set maxlength(value: number | undefined) {
		if (this._maxlength === value) return

		this._maxlength = value
		this.events.emit('change:maxlength', value)
	}

	get autoresize(): boolean {
		return this._autoresize
	}

	set autoresize(value: boolean) {
		if (this._autoresize === value) return

		this._autoresize = value
		this.events.emit('change:autoresize', value)
	}

	get counter(): boolean {
		return this._counter
	}

	set counter(value: boolean) {
		if (this._counter === value) return

		this._counter = value
		this.events.emit('change:counter', value)
	}

	/**
	 * Набор счётчика символов — разметки внутри поля без своего экземпляра,
	 * поэтому набор поля (AGENTS.md, «Часть или слот»), как `listAria` у
	 * Select. Живой, как `aria`: `id` счётчика, на который ссылается поле, в
	 * него пишет плагин связок `TTextareaIdsPlugin`. Об изменении набор
	 * сообщает `change:counterAria`.
	 */
	get counterAria(): TAria {
		return this._counterAria
	}

	/**
	 * Набрано символов — как их считает браузер для `maxlength`: длина текста
	 * поля с переводами строк, приведёнными к одному LF. Из поля значение
	 * приходит уже таким, а из кода — бывает с CR LF, и браузер его тоже
	 * считает одним символом. Иначе «200 / 200» не совпало бы с моментом,
	 * когда браузер перестаёт принимать ввод.
	 */
	get textLength(): number {
		return this.value.replace(LINE_BREAK, '\n').length
	}

	/**
	 * `aria` поля стоит на вложенной `<textarea>`, а не на корне: корень —
	 * рамка поля со счётчиком, а тег поля внутри неё фиксирован.
	 */
	protected override get _ariaTag(): string {
		return 'textarea'
	}

	/**
	 * У `<textarea>` `required` и `readonly` нативные — браузер сам сообщает о
	 * них скринридеру, и ARIA-дублей ядро не пишет.
	 *
	 * Исключение — `required` у поля только для чтения: браузер такое поле не
	 * проверяет, нативный `required` на нём ничего не значит, и без явного
	 * `aria-required` обязательность осталась бы немой. Так же у Input.
	 */
	protected override _syncInputAccessibility(): void {
		this._aria.add('aria-required', this.required && this.readonly ? 'true' : null)
	}

	/**
	 * `data-limit` — набранное у предела: тема громче красит счётчик у предела
	 * и цветом ошибки — сверх него. От `counter` не зависит: предел есть и у
	 * поля без счётчика.
	 */
	protected _syncLimit(): void {
		this._dataset.add('limit', this._limit())
	}

	private _limit(): TTextareaLimit | null {
		const max = this._maxlength

		if (max === undefined) return null

		const length = this.textLength

		if (length > max) return 'exceeded'

		return length === max ? 'reached' : null
	}

	override getProps(): ITextareaProps {
		return {
			...super.getProps(),
			placeholder: this._placeholder,
			rows: this._rows,
			maxRows: this._maxRows,
			maxlength: this._maxlength,
			autoresize: this._autoresize,
			counter: this._counter,
		}
	}
}
