import { TInputControl } from '../../base/input-control'
import type { TDefaultValues } from '../../base/component'
import {
	DEFAULT_LOCALE,
	calendarLocale,
	digitOf,
	parseDate,
	parseFieldDate,
	todayDate,
} from '../../../common'
import type { IDateFieldFormat, TAttributesMap, TCalendarDate, TDatePart } from '../../../common'
import { calendarBounds, inBounds } from '../calendar/dates'
import {
	dateOf,
	emptyParts,
	enterDigit,
	eraseDigit,
	limitsOf,
	partsOf,
	sameParts,
	shownOf,
	stepPart,
	storedOf,
	textOf,
	withPart,
	withoutParts,
} from './parts'
import type {
	IDateInput,
	IDateInputProps,
	TDateInputEdge,
	TDateInputEvents,
	TDateInputPart,
	TDateInputParts,
	TDateInputSegment,
	TDateInputValue,
	TDateInputEdit,
} from './types'

/**
 * Поле даты из частей по формату локали: день, месяц и год — в порядке и с
 * разделителями `Intl.DateTimeFormat#formatToParts`.
 *
 * **Части — буфер правки.** Число каждой части ядро держит само
 * (`TDateInputParts`); значение (`value`) пишется, когда собраны все три и
 * такая дата есть, и снимается, когда собранную дату разобрали. Запись
 * снаружи — части берутся из неё, не дата — части пусты; эхо своей записи
 * (`v-model` вернул то же значение) части не трогает. Отменили
 * `change:value:before` — правки нет, поправили — части показывают итог.
 *
 * **Формат — только от `locale`**: порядок частей, разделители, цифры,
 * подсказки пустых частей, имена частей и направление ряда — формат поля
 * локали (`calendarLocale(locale).dateField`). Смена локали частей не трогает:
 * у них другим становится только текст.
 *
 * **Фокус части** ведёт ядро (`focusedSegment`, как `focusedDate` у
 * календаря): плагин сообщает, куда пришёл DOM-фокус, а ядро переводит его,
 * когда в часть больше нечего дописать. Набранные цифры живут, пока фокус на
 * части.
 *
 * Клавиш, буфера обмена и выделения ядро не знает: их переводят в команды
 * плагины. Выделение всей даты — выделение браузера, а не состояние ядра: оно
 * принадлежит документу, и второй его путь в модели разошёлся бы с ним.
 *
 * `min` и `max` дату не прижимают: собранная дата вне них — `invalid`
 * (`data-invalid` у корня, `aria-invalid` у частей), и её видно таким, какой
 * её набрали.
 */
export class TDateInput
	extends TInputControl<TDateInputValue, IDateInputProps, TDateInputEvents>
	implements IDateInput
{
	static override baseClass = 's-date-input'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<IDateInputProps, 'locale', 'min' | 'max'> = {
		...TInputControl.defaultValues,
		min: undefined,
		max: undefined,
		// Языка интерфейса библиотека не знает: дефолт английский, как у календаря
		locale: DEFAULT_LOCALE,
	}

	protected _min: TCalendarDate | undefined
	protected _max: TCalendarDate | undefined
	protected _locale: string
	protected _parts: TDateInputParts
	protected _focusedSegment: TDatePart | undefined = undefined
	/** Цифры, набранные в часть под фокусом: к ним допишется следующая */
	protected _typed = ''
	/** Своя правка, которую сейчас пишет сеттер `value` */
	private _pending: TDateInputEdit | undefined = undefined

	constructor(props: Partial<IDateInputProps> = {}) {
		const ctor = new.target as typeof TDateInput

		super(props)

		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._parts = partsOf(this._value)

		// Корень — группа частей: имя ей даёт `aria_label` или `aria_labelledBy`
		this._aria.add('role', 'group')

		this.events.on('change:value', () => this._syncInvalid())
		this.events.on('change:min', () => this._syncInvalid())
		this.events.on('change:max', () => this._syncInvalid())

		// Набранные цифры — в цифрах и календаре прежней локали
		this.events.on('change:locale', () => {
			this._typed = ''
		})

		this._syncInvalid()
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	/** Невалидная строка границей не считается. */
	get min(): TCalendarDate | undefined {
		return this._min
	}

	set min(value: TCalendarDate | undefined) {
		if (this._min === value) return

		this._min = value
		this.events.emit('change:min', value)
	}

	/** Раньше `min` — граница схлопывается в `min`, как у календаря. */
	get max(): TCalendarDate | undefined {
		return this._max
	}

	set max(value: TCalendarDate | undefined) {
		if (this._max === value) return

		this._max = value
		this.events.emit('change:max', value)
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change:locale', value)
	}

	/** Собранная дата вне `min`/`max`. Даты нет — верно: проверять нечего. */
	get invalid(): boolean {
		const date = parseDate(this._value)

		return date !== undefined && !inBounds(date, calendarBounds(this._min, this._max))
	}

	get focusedSegment(): TDatePart | undefined {
		return this._focusedSegment
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * Части и разделители в порядке формата локали — снимок на каждое чтение,
	 * как сетки календаря.
	 */
	get segments(): TDateInputSegment[] {
		const format = this._format
		const empty = emptyParts(this._parts)

		return format.tokens.map((token, index) =>
			token.type === 'literal'
				? {
						key: `literal-${index}`,
						type: 'literal',
						text: token.text,
						placeholder: empty,
						aria: { 'aria-hidden': 'true' },
					}
				: this._segment(token.type, format),
		)
	}

	/**
	 * Атрибуты ряда частей. `dir` — направление даты в локали, а не поля:
	 * `ar-EG` пишет дату справа налево, `he-IL` — слева направо и на странице
	 * справа налево. Не `dir="auto"`: подсказки из букв иврита перевернули бы
	 * ряд, когда дату наберут. `lang` — язык формата: глифы и шейпинг даты — по
	 * её языку, а не языку страницы.
	 */
	get segmentsAttrs(): TAttributesMap {
		const format = this._format

		return { dir: format.direction, lang: format.lang }
	}

	get segmentsDirection(): 'ltr' | 'rtl' {
		return this._format.direction
	}

	/* ------------------------------------------------------------------ */
	/* Команды                                                            */
	/* ------------------------------------------------------------------ */

	focusSegment(part: TDatePart | undefined): void {
		if (this._focusedSegment === part) return

		this._focusedSegment = part
		this._typed = ''
		this.events.emit('change:focusedSegment', part)
	}

	shiftFocus(count: number): void {
		const order = this._format.parts
		const index = this._focusedSegment === undefined ? -1 : order.indexOf(this._focusedSegment)
		const next = index === -1 ? undefined : order[index + Math.round(count)]

		if (next !== undefined) this.focusSegment(next)
	}

	typeKey(key: string): boolean {
		const part = this._focusedSegment
		const digit = digitOf(key, this._format.digits)

		if (part === undefined || digit === undefined) return false
		if (!this._editable) return true

		this._enter(this._parts, this._typed, part, digit)

		return true
	}

	replaceSegments(parts: readonly TDatePart[], key: string): boolean {
		const digit = digitOf(key, this._format.digits)
		const first = this._format.parts.find((part) => parts.includes(part))

		if (digit === undefined || first === undefined) return false
		if (!this._editable) return true

		this.focusSegment(first)
		this._enter(withoutParts(this._parts, parts), '', first, digit)

		return true
	}

	shiftSegment(count: number): void {
		const part = this._focusedSegment

		if (part === undefined || !this._editable) return

		this._typed = ''
		this._commit(
			stepPart(this._parts, part, count, this._format.yearOffset, partsOf(todayDate())),
		)
	}

	moveSegmentToEdge(edge: TDateInputEdge): void {
		const part = this._focusedSegment

		if (part === undefined || !this._editable) return

		const { min, max } = limitsOf(part, this._parts, this._format.yearOffset)
		const shown = edge === 'start' ? min : max

		this._typed = ''
		this._commit(withPart(this._parts, part, storedOf(part, shown, this._format.yearOffset)))
	}

	eraseDigit(): void {
		const part = this._focusedSegment

		if (part === undefined || !this._editable) return

		const erased = eraseDigit(this._parts, part, this._format.yearOffset)

		// Пустую часть стирать нечего: Backspace идёт дальше, к предыдущей
		if (erased === undefined) {
			this.shiftFocus(-1)

			return
		}

		const typed = this._typed

		this._typed = erased.typed

		if (!this._commit(erased.parts)) this._typed = typed
	}

	clearSegment(): void {
		const part = this._focusedSegment

		if (part === undefined || !this._editable) return

		this._typed = ''
		this._commit(withPart(this._parts, part, undefined))
	}

	clearSegments(parts: readonly TDatePart[]): void {
		if (!this._editable) return

		this._typed = ''
		this._commit(withoutParts(this._parts, parts))
	}

	paste(text: string): boolean {
		if (!this._editable) return false

		const date = parseFieldDate(text, this._format)

		if (date === undefined) return false

		this._typed = ''

		return this._commit(partsOf(date))
	}

	override getProps(): IDateInputProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			locale: this._locale,
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Формат поля локали — один объект на тег. */
	protected get _format(): IDateFieldFormat {
		return calendarLocale(this._locale).dateField
	}

	/** Править можно: поле не выключено и не только для чтения. */
	protected get _editable(): boolean {
		return !this.disabled && !this.readonly
	}

	/**
	 * Значение сменилось — части за ним. Своя правка оставляет свои части, если
	 * значение записалось как есть: из него те же части не собрать (у недописанной
	 * даты значения нет вовсе). Запись снаружи и поправленная в
	 * `change:value:before` правка берут части из значения, набранные цифры
	 * сбрасываются.
	 */
	protected override _valueChanged(oldValue: TDateInputValue): void {
		const pending = this._pending

		this._pending = undefined

		if (pending !== undefined && pending.date === this._value) {
			this._parts = pending.parts
		} else {
			this._parts = partsOf(this._value)
			this._typed = ''
		}

		super._valueChanged(oldValue)
		this.events.emit('change:segments')
	}

	/**
	 * Записать правку частей. Значение то же — сменились только части. Иначе
	 * значение пишется сеттером: его можно поправить или отменить в
	 * `change:value:before`. Возвращает, принята ли правка.
	 */
	protected _commit(next: TDateInputParts): boolean {
		const date = dateOf(next)

		if (date === this._value) {
			this._setParts(next)

			return true
		}

		const pending: TDateInputEdit = { parts: next, date }

		this._pending = pending
		this.value = date

		// Сеттер не дошёл до `_valueChanged` — запись отменили
		const accepted = this._pending !== pending

		this._pending = undefined

		return accepted
	}

	protected _setParts(next: TDateInputParts): void {
		if (sameParts(next, this._parts)) return

		this._parts = next
		this.events.emit('change:segments')
	}

	/** Набор цифры в часть; дописать больше некуда — фокус на следующую. */
	protected _enter(parts: TDateInputParts, typed: string, part: TDatePart, digit: number): void {
		const previous = this._typed
		const entry = enterDigit(parts, typed, part, digit, this._format.yearOffset)

		this._typed = entry.typed

		if (!this._commit(entry.parts)) {
			this._typed = previous

			return
		}

		if (entry.advance) this.shiftFocus(1)
	}

	/** Часть — снимок для разметки. */
	protected _segment(part: TDatePart, format: IDateFieldFormat): TDateInputPart {
		const { min, max } = limitsOf(part, this._parts, format.yearOffset)
		const shown = shownOf(part, this._parts, format.yearOffset)
		const text = textOf(part, this._parts, format)
		const empty = shown === undefined

		return {
			key: part,
			type: part,
			text,
			placeholder: empty,
			aria: {
				role: 'spinbutton',
				'aria-label': format.names[part],
				'aria-valuenow': empty ? null : String(shown),
				'aria-valuetext': empty ? null : text,
				'aria-valuemin': String(min),
				'aria-valuemax': String(max),
				'aria-invalid': this.invalid ? 'true' : null,
				'aria-required': this.required ? 'true' : null,
				'aria-readonly': this.readonly ? 'true' : null,
				'aria-disabled': this.disabled ? 'true' : null,
				// Своя остановка Tab у каждой части; у выключенного поля — ни одной
				tabindex: this.disabled ? null : '0',
			},
			dataset: { 'data-type': part, 'data-placeholder': String(empty) },
		}
	}

	/** `data-invalid` — состояние для темы: дата вне `min`/`max`. */
	protected _syncInvalid(): void {
		this._dataset.add('invalid', this.invalid)
	}
}
