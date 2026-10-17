import { TAria } from '../../../common'
import type { TEventSink } from '../../../common'
import { TStylable } from '../../base/stylable'
import type { TDefaultValues } from '../../base/component'
import type { IField, IFieldProps, TFieldEvents, TFieldPosition } from './types'

/**
 * Поле формы: подпись, контрол, подсказка и ошибка.
 *
 * Контрол — Input, Select, CheckBox, Switch, DateInput, DatePicker, RadioGroup
 * или Rating — потребитель кладёт в поле, а подпись, подсказка и ошибка — его
 * разметка: потребитель их не размещает и пропсов им не задаёт (AGENTS.md,
 * «Часть или слот»). Текст части — проп с её именем, своя разметка вместо
 * текста — слот `<часть>-content`. Часть стоит, пока задан её текст: ссылки
 * на части ставит связка, а слотов она не видит — без этого правила
 * `aria-describedby` указывал бы на `id`, которого нет в разметке.
 *
 * **Ошибка заменяет подсказку.** Ошибка видна, пока поле невалидно и у неё
 * есть текст, подсказка — пока текст есть, а ошибки не видно: под контролом
 * одна строка пояснений, и `aria-describedby` контрола ведёт на ту, что
 * видна. Валидации у поля нет: что неверно и когда это показывать, решает
 * приложение и пишет `invalid`.
 *
 * **Состояний контрола поле не дублирует**, как подпись `Label`: выключенность,
 * только чтение, обязательность и размер — у контрола, и тема читает их с его
 * корня. Своё у поля — только ошибка: её поле пишет контролу само.
 *
 * С контролом поле связывает проводка адаптера (`setup/content/extensions/field`):
 * поле опускает связку своему поддереву, контрол её берёт. `id` частей, `for`
 * подписи и ссылки контрола на части строит плагин связок (`TFieldIdsPlugin`)
 * от монтирования: ядро — модель, которой можно пользоваться и без документа.
 *
 * `position` — union ядра: смысл стороны один в любой теме. Порядок частей в
 * DOM один на все стороны — подпись, контрол, подсказка, ошибка, — сторону
 * рисует тема по модификатору `--position-<v>`. Модификатор стоит всегда, как
 * `--size-*`.
 */
export default class TField extends TStylable<IFieldProps, TFieldEvents> implements IField {
	static override baseClass = 'so-field'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IFieldProps, 'label' | 'helper' | 'error' | 'invalid' | 'position'> = {
		...TStylable.defaultValues,
		label: '',
		helper: '',
		error: '',
		invalid: false,
		position: 'top',
	}

	protected _label: string
	protected _helper: string
	protected _error: string
	protected _invalid: boolean
	protected _position!: TFieldPosition
	protected readonly _labelAria: TAria
	protected readonly _helperAria: TAria
	protected readonly _errorAria: TAria

	constructor(props: Partial<IFieldProps> = {}) {
		super(props)

		const ctor = new.target as typeof TField

		this._label = props.label ?? ctor.defaultValues.label
		this._helper = props.helper ?? ctor.defaultValues.helper
		this._error = props.error ?? ctor.defaultValues.error
		this._invalid = props.invalid ?? ctor.defaultValues.invalid

		this._applyPosition(props.position ?? ctor.defaultValues.position)

		this._labelAria = this._partAria('change:labelAria')
		this._helperAria = this._partAria('change:helperAria')
		this._errorAria = this._partAria('change:errorAria')
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TFieldEvents> {
		return this.events
	}

	get label(): string {
		return this._label
	}

	set label(value: string) {
		if (this._label === value) return

		this._label = value
		this._sink.emit('change:label', value)
	}

	get helper(): string {
		return this._helper
	}

	set helper(value: string) {
		if (this._helper === value) return

		this._helper = value
		this._sink.emit('change:helper', value)
	}

	get error(): string {
		return this._error
	}

	set error(value: string) {
		if (this._error === value) return

		this._error = value
		this._sink.emit('change:error', value)
	}

	get invalid(): boolean {
		return this._invalid
	}

	set invalid(value: boolean) {
		if (this._invalid === value) return

		this._invalid = value
		this._sink.emit('change:invalid', value)
	}

	get position(): TFieldPosition {
		return this._position
	}

	set position(value: TFieldPosition) {
		if (this._position === value) return

		this._applyPosition(value, this._position)
		this._sink.emit('change:position', value)
	}

	/** Ошибка видна: поле невалидно, и текст ошибки есть. */
	get errorRendered(): boolean {
		return this._invalid && this._error !== ''
	}

	/** Подсказка видна: текст есть, а ошибки не видно — ошибка встаёт на её место. */
	get helperRendered(): boolean {
		return this._helper !== '' && !this.errorRendered
	}

	/**
	 * Набор подписи. Подпись — разметка без экземпляра, поэтому набор — поля
	 * (AGENTS.md, «Часть или слот»), как `titleAria` у окна. Живой: `id` и
	 * `for` — связку подписи с контролом — пишет плагин связок, об изменении
	 * набор сообщает `change:labelAria`.
	 */
	get labelAria(): TAria {
		return this._labelAria
	}

	/** Набор подсказки: `id` — на него ссылается `aria-describedby` контрола. */
	get helperAria(): TAria {
		return this._helperAria
	}

	/** Набор ошибки: `id` — на него ссылается `aria-describedby` контрола. */
	get errorAria(): TAria {
		return this._errorAria
	}

	override getProps(): IFieldProps {
		return {
			...super.getProps(),
			label: this._label,
			helper: this._helper,
			error: this._error,
			invalid: this._invalid,
			position: this._position,
		}
	}

	protected _applyPosition(newValue: TFieldPosition, oldValue?: TFieldPosition): void {
		this._classes.swap({ prefix: '--position-', oldValue, newValue })

		this._position = newValue
	}

	/** Живой набор части: о записи в него сообщает своё событие. */
	private _partAria(event: 'change:labelAria' | 'change:helperAria' | 'change:errorAria'): TAria {
		const aria = new TAria()

		aria.events.on('change', () => this._sink.emit(event, aria.toObject()))

		return aria
	}
}
