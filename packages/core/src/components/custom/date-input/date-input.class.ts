import { TInputControl } from '../../base/input-control'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE } from '../../../common'
import type { TAttributesMap } from '../../../common'
import { fieldValueOf, nowOf, outOfBounds, parseFieldText, partsOfValue } from './date-time'
import { fieldFormat } from './format'
import type { IDateFieldFormat } from './format'
import {
	emptyParts,
	enterKey,
	erasePart,
	fieldPartOf,
	partAtEdge,
	sameParts,
	shownOf,
	stepPart,
	textOf,
	withPart,
	withoutParts,
} from './segments'
import type { TFieldPart, TKeyEntry } from './segments'
import type {
	IDateInput,
	IDateInputProps,
	TDateFieldPart,
	TDateGranularity,
	TDateInputBound,
	TDateInputEdge,
	TDateInputEvents,
	TDateInputPart,
	TDateInputParts,
	TDateInputSegment,
	TDateInputValue,
	TDateInputEdit,
} from './types'

/**
 * Поле даты из частей по формату локали: день, месяц и год, а с точностью до
 * минуты — ещё час, минута и период суток, в порядке и с разделителями
 * `Intl.DateTimeFormat#formatToParts`.
 *
 * **Части — буфер правки.** Число каждой части ядро держит само
 * (`TDateInputParts`); значение (`value`) пишется, когда собраны все части
 * точности и такое значение есть, и снимается, когда собранное разобрали.
 * Запись снаружи — части берутся из неё (дата или дата со временем — при любой
 * точности), не значение — части пусты; эхо своей записи (`v-model` вернул то
 * же значение) части не трогает. Отменили `change:value:before` — правки нет,
 * поправили — части показывают итог.
 *
 * **Формат — только от `locale` и точности** (`granularity`): порядок частей,
 * разделители, цифры, цикл часов, имена периодов суток, подсказки пустых
 * частей, имена частей и направление ряда — формат поля локали
 * (`fieldFormat(locale, granularity)`). Смена локали и точности
 * частей не трогает: другими становятся текст и состав частей формата, а
 * время, скрытое точностью до дня, остаётся в частях и вернётся. Значение
 * пишется заново, только если те же части в новом формате собираются иначе.
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
 * `min` и `max` значение не прижимают: собранное значение вне них — `invalid`
 * (`data-invalid` у корня, `aria-invalid` у частей), и его видно таким, каким
 * его набрали. Дата и дата со временем сравниваются по дню.
 */
export class TDateInput
	extends TInputControl<TDateInputValue, IDateInputProps, TDateInputEvents>
	implements IDateInput
{
	static override baseClass = 's-date-input'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<IDateInputProps, 'locale' | 'granularity', 'min' | 'max'> = {
		...TInputControl.defaultValues,
		min: undefined,
		max: undefined,
		// Языка интерфейса библиотека не знает: дефолт английский, как у календаря
		locale: DEFAULT_LOCALE,
		granularity: 'day',
	}

	protected _min: TDateInputBound
	protected _max: TDateInputBound
	protected _locale: string
	protected _granularity: TDateGranularity
	protected _parts: TDateInputParts
	protected _focusedSegment: TDateFieldPart | undefined = undefined
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
		this._granularity = props.granularity ?? ctor.defaultValues.granularity
		this._parts = partsOfValue(this._value)

		// Корень — группа частей: имя ей даёт `aria_label` или `aria_labelledBy`
		this._aria.add('role', 'group')

		this.events.on('change:value', () => this._syncInvalid())
		this.events.on('change:min', () => this._syncInvalid())
		this.events.on('change:max', () => this._syncInvalid())

		this._syncInvalid()
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	/** Невалидная строка границей не считается. */
	get min(): TDateInputBound {
		return this._min
	}

	set min(value: TDateInputBound) {
		if (this._min === value) return

		this._min = value
		this.events.emit('change:min', value)
	}

	/** Раньше `min` — граница схлопывается в `min`, как у календаря. */
	get max(): TDateInputBound {
		return this._max
	}

	set max(value: TDateInputBound) {
		if (this._max === value) return

		this._max = value
		this.events.emit('change:max', value)
	}

	get locale(): string {
		return this._locale
	}

	/** Части те же; значение — только если цикл часов сменил, нужен ли период суток. */
	set locale(value: string) {
		if (this._locale === value) return

		const before = fieldValueOf(this._parts, this._format)

		this._locale = value
		this.events.emit('change:locale', value)
		this._formatChanged(before)
	}

	get granularity(): TDateGranularity {
		return this._granularity
	}

	/**
	 * Части сохраняются по типу, а значение собирается из них в новой точности
	 * — так же, как после правки: время ушло из значения и вернётся в него, а
	 * дата без набранного времени значения не даёт.
	 */
	set granularity(value: TDateGranularity) {
		if (this._granularity === value) return

		const before = fieldValueOf(this._parts, this._format)

		this._granularity = value
		this.events.emit('change:granularity', value)
		this._formatChanged(before)
	}

	/** Собранное значение вне `min`/`max`. Значения нет — верно: проверять нечего. */
	get invalid(): boolean {
		return outOfBounds(this._value, this._min, this._max)
	}

	get focusedSegment(): TDateFieldPart | undefined {
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
		const empty = emptyParts(this._parts, format)

		return format.tokens.map((token, index) =>
			token.type === 'literal'
				? {
						key: `literal-${index}`,
						type: 'literal',
						text: token.text,
						placeholder: empty,
						aria: { 'aria-hidden': 'true' },
					}
				: this._segment(token, format),
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

	focusSegment(part: TDateFieldPart | undefined): void {
		if (this._focusedSegment === part) return

		this._focusedSegment = part
		this._typed = ''
		this.events.emit('change:focusedSegment', part)
	}

	shiftFocus(count: number): void {
		const order = this._format.parts
		const index = order.findIndex((part) => part.type === this._focusedSegment)
		const next = index === -1 ? undefined : order[index + Math.round(count)]

		if (next !== undefined) this.focusSegment(next.type)
	}

	typeKey(key: string): boolean {
		const part = this._focusedPart

		if (part === undefined) return false

		const entry = enterKey(this._parts, this._typed, part, key)

		if (entry === undefined) return false
		if (this._editable) this._enter(entry)

		return true
	}

	replaceSegments(parts: readonly TDateFieldPart[], key: string): boolean {
		const format = this._format
		const first = format.parts.find((part) => parts.includes(part.type))

		if (first === undefined) return false

		const entry = enterKey(withoutParts(this._parts, parts, format), '', first, key)

		if (entry === undefined) return false
		if (!this._editable) return true

		this.focusSegment(first.type)
		this._enter(entry)

		return true
	}

	shiftSegment(count: number): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._typed = ''
		this._commit(stepPart(this._parts, part, count, nowOf(this._format)))
	}

	moveSegmentToEdge(edge: TDateInputEdge): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._typed = ''
		this._commit(partAtEdge(this._parts, part, edge))
	}

	eraseDigit(): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		const erased = erasePart(this._parts, part)

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
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._typed = ''
		this._commit(withPart(this._parts, part, undefined))
	}

	clearSegments(parts: readonly TDateFieldPart[]): void {
		if (!this._editable) return

		this._typed = ''
		this._commit(withoutParts(this._parts, parts, this._format))
	}

	/**
	 * Вставленное значение заменяет части, которые показывает поле: время,
	 * скрытое точностью до дня, остаётся в частях.
	 */
	paste(text: string): boolean {
		if (!this._editable) return false

		const value = parseFieldText(text, this._format)

		if (value === undefined) return false

		this._typed = ''

		return this._commit({ ...this._parts, ...partsOfValue(value) })
	}

	override getProps(): IDateInputProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			locale: this._locale,
			granularity: this._granularity,
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Формат поля локали в точности поля — один объект на тег и точность. */
	protected get _format(): IDateFieldFormat {
		return fieldFormat(this._locale, this._granularity)
	}

	/** Часть формата под фокусом с её правилом; фокуса нет — `undefined`. */
	protected get _focusedPart(): TFieldPart | undefined {
		const type = this._focusedSegment

		return type === undefined ? undefined : fieldPartOf(type, this._format)
	}

	/** Править можно: поле не выключено и не только для чтения. */
	protected get _editable(): boolean {
		return !this.disabled && !this.readonly
	}

	/**
	 * Значение сменилось — части за ним. Своя правка оставляет свои части, если
	 * значение записалось как есть: из него те же части не собрать (у недописанной
	 * даты значения нет вовсе, а время, ушедшее из значения при точности до дня,
	 * в частях остаётся). Запись снаружи и поправленная в `change:value:before`
	 * правка берут части из значения, набранные цифры сбрасываются.
	 */
	protected override _valueChanged(oldValue: TDateInputValue): void {
		const pending = this._pending

		this._pending = undefined

		if (pending !== undefined && pending.value === this._value) {
			this._parts = pending.parts
		} else {
			this._parts = partsOfValue(this._value)
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
		const value = fieldValueOf(next, this._format)

		if (value === this._value) {
			this._setParts(next)

			return true
		}

		const pending: TDateInputEdit = { parts: next, value }

		this._pending = pending
		this.value = value

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

	/** Набранный знак — в части; дописать больше некуда — фокус на следующую. */
	protected _enter(entry: TKeyEntry): void {
		const previous = this._typed

		this._typed = entry.typed

		if (!this._commit(entry.parts)) {
			this._typed = previous

			return
		}

		if (entry.advance) this.shiftFocus(1)
	}

	/**
	 * Формат сменился — локаль или точность. Набранные цифры были в прежнем
	 * формате; части под фокусом в новом может не быть (период суток у
	 * 24-часовой локали, время у точности до дня) — тогда фокуса в поле нет: её
	 * узел разметка сняла вместе с DOM-фокусом.
	 *
	 * Значение пишется заново, только если те же части в новом формате
	 * собираются иначе, чем в прежнем (`before`): точность меняет вид значения, а
	 * цикл часов — нужен ли выбранный период суток. Значение, записанное снаружи
	 * и полем не собранное, смена формата, которая его прочтение не меняет, не
	 * трогает.
	 */
	protected _formatChanged(before: TDateInputValue): void {
		this._typed = ''

		if (this._focusedSegment !== undefined && this._focusedPart === undefined) {
			this.focusSegment(undefined)
		}
		if (fieldValueOf(this._parts, this._format) !== before) this._commit(this._parts)
	}

	/** Часть — снимок для разметки. */
	protected _segment(part: TFieldPart, format: IDateFieldFormat): TDateInputPart {
		const { type } = part
		const { min, max } = part.rule.limits(this._parts)
		const shown = shownOf(this._parts, part)
		const text = textOf(this._parts, part)
		const empty = shown === undefined

		return {
			key: type,
			type,
			text,
			placeholder: empty,
			aria: {
				role: 'spinbutton',
				'aria-label': format.names[type],
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
			dataset: { 'data-type': type, 'data-placeholder': String(empty) },
		}
	}

	/** `data-invalid` — состояние для темы: значение вне `min`/`max`. */
	protected _syncInvalid(): void {
		this._dataset.add('invalid', this.invalid)
	}
}
