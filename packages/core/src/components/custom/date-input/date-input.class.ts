import { TClearable } from '../../base/clearable'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE, TAria, TAttributes } from '../../../common'
import type { TAttributesMap } from '../../../common'
import type { TCalendarUnavailable } from '../calendar'
import {
	dateOfValue,
	fieldValueOf,
	nowOf,
	outOfBounds,
	parseFieldText,
	partsOfValue,
} from './date-time'
import { fieldFormat } from './format'
import type { IDateFieldFormat } from './format'
import {
	emptyPart,
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
	TDateInputKind,
	TDateInputBound,
	TDateInputEdge,
	TDateInputEvents,
	TDateInputPart,
	TDateInputParts,
	TDateInputSegment,
	TDateInputSegmentSets,
	TDateInputValue,
	TDateInputEdit,
	TTimePrecision,
} from './types'

/**
 * Роль части — счётчик: у каждой своя клавиатура и своё значение. Набор части
 * её заменяет там, где счётчик недоступен (`textbox` на сенсорных устройствах
 * Apple).
 */
const SEGMENT_ROLE = 'spinbutton'

/**
 * Поле даты из частей по формату локали: день, месяц и год, а у поля даты и
 * времени (`kind: 'datetime'`) — ещё час, минута, с точностью до секунды
 * (`timePrecision: 'second'`) секунда и период суток, в порядке и с
 * разделителями `Intl.DateTimeFormat#formatToParts`.
 *
 * **Части — буфер правки.** Число каждой части ядро держит само
 * (`TDateInputParts`); значение (`value`) пишется, когда собраны все части
 * формата и такое значение есть, и снимается, когда собранное разобрали.
 * Запись снаружи — части берутся из неё (дата или дата со временем любой
 * точности — при любом виде поля), не значение — части пусты; эхо своей
 * записи (`v-model` вернул то же значение) части не трогает. Отменили
 * `change:value:before` — правки нет, поправили — части показывают итог.
 *
 * **Формат — только от `locale`, вида поля** (`kind`) **и точности времени**
 * (`timePrecision`): порядок частей, разделители, цифры, цикл часов, имена
 * периодов суток, подсказки пустых частей, имена частей и направление ряда —
 * формат поля локали (`fieldFormat(locale, kind, timePrecision)`). Смена
 * локали, вида и точности частей не трогает: другими становятся текст и
 * состав частей формата, а время, скрытое у поля даты, и секунда, скрытая у
 * точности до минуты, остаются в частях и вернутся. Значение пишется заново,
 * только если те же части в новом формате собираются иначе.
 *
 * **Фокус части** ведёт ядро (`focusedSegment`, как `focusedDate` у
 * календаря): плагин сообщает, куда пришёл DOM-фокус, а ядро переводит его,
 * когда в часть больше нечего дописать. Набранные цифры живут, пока фокус на
 * части, и, пока у неё нет числа, видны в ней: ноль, с которого часть не
 * начинается (день, месяц, год, час `h12` и `h24`), снимает её число до
 * следующей цифры и показан нулями («00»). Одинокий ноль — ошибка
 * пользователя: ни `invalid`, ни дописанного числа, а ушёл фокус — часть
 * пуста. Набранное пишется одним путём с частями, и его смена в тексте части
 * — тоже `change:segments`.
 *
 * Клавиш, буфера обмена и выделения ядро не знает: их переводят в команды
 * плагины. Выделение всей даты — выделение браузера, а не состояние ядра: оно
 * принадлежит документу, и второй его путь в модели разошёлся бы с ним.
 *
 * **Наборы части** (`segmentSets`) — то, что пишут в часть плагины: `id`, а на
 * сенсорном устройстве — редактируемость, роль и имя. Ни устройства, ни `id`
 * ядро не знает; наборы оно раскладывает в `segments` поверх своего, как
 * календарь — наборы места сетки. Роль из набора меняет и значение части:
 * `aria-value*` — у счётчика, у текстового поля значение — сам текст.
 *
 * `min` и `max` значение не прижимают: собранное значение вне них — `invalid`
 * (`data-invalid` и `aria-invalid` у корня, `aria-invalid` у частей), и его
 * видно таким, каким его набрали. Сравнение — с точностью грубейшего: дата и
 * дата со временем — по дню, время до минуты и время до секунды — до минуты.
 * Так же и день, которого не даст выбрать календарь: `unavailable` — та же
 * функция, что у календаря, — поле зовёт с днём значения (у даты со временем —
 * с её днём) и без якоря: начатого диапазона у поля нет. Ошибку, записанную
 * снаружи (её задаёт поле формы `Field`), это не отменяет: итог `invalid` —
 * своё или своя проверка, как итог `value` у Slider.
 *
 * **Очистка** (`clear`, кнопка `clearable`) опустошает все части, и скрытые
 * форматом тоже: смена вида или точности после неё скрытое время не вернёт.
 */
export class TDateInput
	extends TClearable<TDateInputValue, IDateInputProps, TDateInputEvents>
	implements IDateInput
{
	static override baseClass = 'so-date-input'

	static defaultValues: typeof TClearable.defaultValues &
		TDefaultValues<
			IDateInputProps,
			'locale' | 'kind' | 'timePrecision' | 'validate',
			'min' | 'max' | 'unavailable'
		> = {
		...TClearable.defaultValues,
		min: undefined,
		max: undefined,
		unavailable: undefined,
		// Язык задаёт приложение (плагин языка), а до него — английский, как у
		// календаря
		locale: DEFAULT_LOCALE,
		kind: 'date',
		timePrecision: 'minute',
		// Верна ли дата, по умолчанию решает приложение
		validate: false,
	}

	protected _min: TDateInputBound
	protected _max: TDateInputBound
	protected _unavailable: TCalendarUnavailable | undefined
	protected _locale: string
	protected _kind: TDateInputKind
	protected _timePrecision: TTimePrecision
	protected _validate: boolean
	protected _parts: TDateInputParts
	protected _focusedSegment: TDateFieldPart | undefined = undefined
	/**
	 * Цифры, набранные в часть под фокусом: к ним допишется следующая. Пишутся
	 * только вместе с частями — `_write` и `_valueChanged`
	 */
	protected _typed = ''
	/** Своя правка, которую сейчас пишет сеттер `value` */
	private _pending: TDateInputEdit | undefined = undefined
	/** Наборы частей по типу — в них пишут плагины */
	private readonly _segmentSets = new Map<TDateFieldPart, TDateInputSegmentSets>()

	constructor(props: Partial<IDateInputProps> = {}) {
		const ctor = new.target as typeof TDateInput

		super(props)

		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._unavailable = props.unavailable ?? ctor.defaultValues.unavailable
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._kind = props.kind ?? ctor.defaultValues.kind
		this._timePrecision = props.timePrecision ?? ctor.defaultValues.timePrecision
		this._validate = props.validate ?? ctor.defaultValues.validate
		this._parts = partsOfValue(this._value)

		// Корень — группа частей: имя ей даёт `aria_label` или `aria_labelledBy`
		this._aria.add('role', 'group')

		// Значение могло прийти вне границ — ошибка с первой отрисовки
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

		const invalid = this.invalid

		this._min = value
		this._invalidChanged(invalid)
		this.events.emit('change:min', value)
	}

	/** Раньше `min` — граница схлопывается в `min`, как у календаря. */
	get max(): TDateInputBound {
		return this._max
	}

	set max(value: TDateInputBound) {
		if (this._max === value) return

		const invalid = this.invalid

		this._max = value
		this._invalidChanged(invalid)
		this.events.emit('change:max', value)
	}

	/** Функция сверяется по ссылке: заданная заново — смена, как у календаря. */
	get unavailable(): TCalendarUnavailable | undefined {
		return this._unavailable
	}

	set unavailable(value: TCalendarUnavailable | undefined) {
		if (this._unavailable === value) return

		const invalid = this.invalid

		this._unavailable = value
		this._invalidChanged(invalid)
		this.events.emit('change:unavailable', value)
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

	get kind(): TDateInputKind {
		return this._kind
	}

	/**
	 * Части сохраняются по типу, а значение собирается из них в новом виде
	 * — так же, как после правки: время ушло из значения и вернётся в него, а
	 * дата без набранного времени значения не даёт.
	 */
	set kind(value: TDateInputKind) {
		if (this._kind === value) return

		const before = fieldValueOf(this._parts, this._format)

		this._kind = value
		this.events.emit('change:kind', value)
		this._formatChanged(before)
	}

	get timePrecision(): TTimePrecision {
		return this._timePrecision
	}

	/**
	 * Как смена вида: части сохраняются по типу, а значение собирается из них в
	 * новой точности — секунда ушла из значения и вернётся в него, а время без
	 * набранной секунды значения не даёт. У поля даты частей времени нет, и
	 * значение то же.
	 */
	set timePrecision(value: TTimePrecision) {
		if (this._timePrecision === value) return

		const before = fieldValueOf(this._parts, this._format)

		this._timePrecision = value
		this.events.emit('change:timePrecision', value)
		this._formatChanged(before)
	}

	/**
	 * Проверка набора: число ниже хода части («00» у дня и месяца) не
	 * записывается, и часть ждёт следующей цифры. Выключена — набранное
	 * записывается как есть, и верна ли дата, решает приложение. Набранного не
	 * меняет: действует со следующей цифры.
	 */
	get validate(): boolean {
		return this._validate
	}

	set validate(value: boolean) {
		if (this._validate === value) return

		this._validate = value
		this.events.emit('change:validate', value)
	}

	/**
	 * Итог ошибки: своё — записанное полем формы `Field` или кодом, — или
	 * собранное значение вне `min`/`max`, или его день недоступен. Значения нет
	 * — своей проверке нечего проверять.
	 */
	override get invalid(): boolean {
		return this._invalid || this._outOfRange(this._value)
	}

	override set invalid(value: boolean) {
		super.invalid = value
	}

	get focusedSegment(): TDateFieldPart | undefined {
		return this._focusedSegment
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * Части и разделители в порядке формата локали — снимок на каждое чтение,
	 * как сетки календаря. Набранное в нём — только у части под фокусом: живёт
	 * оно, пока фокус на ней. `invalid` считается раз на снимок, а не на часть:
	 * функцию потребителя `unavailable` на каждую часть заново не зовут.
	 */
	get segments(): TDateInputSegment[] {
		const format = this._format
		const empty = emptyParts(this._parts, this._typed, format)
		const invalid = this.invalid

		return format.tokens.map((token, index) =>
			token.type === 'literal'
				? {
						key: `literal-${index}`,
						type: 'literal',
						text: token.text,
						placeholder: empty,
						aria: { 'aria-hidden': 'true' },
					}
				: this._segment(token, format, invalid),
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

	/**
	 * Наборы части `part` — то, что пишут в неё плагины. По типу, а не по месту
	 * в формате: смена локали переставляет части, а записанное в них остаётся
	 * с ними. Заводятся при первом обращении; их смена — `change:segments`.
	 */
	segmentSets(part: TDateFieldPart): TDateInputSegmentSets {
		const existing = this._segmentSets.get(part)

		if (existing) return existing

		const sets: TDateInputSegmentSets = { aria: new TAria(), attrs: new TAttributes() }

		// Both sets report one `change:segments`, without a snapshot
		const changed = () => this.events.emit('change:segments')

		sets.aria.subscribe(changed)
		sets.attrs.subscribe(changed)

		this._segmentSets.set(part, sets)

		return sets
	}

	/* ------------------------------------------------------------------ */
	/* Команды                                                            */
	/* ------------------------------------------------------------------ */

	focusSegment(part: TDateFieldPart | undefined): void {
		if (this._focusedSegment === part) return

		// Набранное — части под фокусом и уходит с ней: её нули сменяет подсказка
		this._write(this._parts, '')
		this._focusedSegment = part
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

		const entry = enterKey(this._parts, this._typed, part, key, this._validate)

		if (entry === undefined) return false
		if (this._editable) this._enter(entry)

		return true
	}

	replaceSegments(parts: readonly TDateFieldPart[], key: string): boolean {
		const format = this._format
		const first = format.parts.find((part) => parts.includes(part.type))

		if (first === undefined) return false

		const entry = enterKey(
			withoutParts(this._parts, parts, format),
			'',
			first,
			key,
			this._validate,
		)

		if (entry === undefined) return false
		if (!this._editable) return true

		this.focusSegment(first.type)
		this._enter(entry)

		return true
	}

	shiftSegment(count: number): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._commit(stepPart(this._parts, part, count, nowOf(this._format)))
	}

	moveSegmentToEdge(edge: TDateInputEdge): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._commit(partAtEdge(this._parts, part, edge))
	}

	eraseDigit(): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		const erased = erasePart(this._parts, this._typed, part)

		// Пустую часть — ни числа, ни набранного — стирать нечего: Backspace идёт
		// дальше, к предыдущей
		if (erased === undefined) {
			this.shiftFocus(-1)

			return
		}

		this._commit(erased.parts, erased.typed)
	}

	clearSegment(): void {
		const part = this._focusedPart

		if (part === undefined || !this._editable) return

		this._commit(withPart(this._parts, part, undefined))
	}

	clearSegments(parts: readonly TDateFieldPart[]): void {
		if (!this._editable) return

		this._commit(withoutParts(this._parts, parts, this._format))
	}

	/**
	 * Вставленное значение заменяет части, которые показывает поле: время,
	 * скрытое у поля даты, остаётся в частях.
	 */
	paste(text: string): boolean {
		if (!this._editable) return false

		const value = parseFieldText(text, this._format)

		if (value === undefined) return false

		return this._commit({ ...this._parts, ...partsOfValue(value) })
	}

	override getProps(): IDateInputProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			locale: this._locale,
			kind: this._kind,
			timePrecision: this._timePrecision,
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Формат поля локали, вида и точности — один объект на тег, вид и точность. */
	protected get _format(): IDateFieldFormat {
		return fieldFormat(this._locale, this._kind, this._timePrecision)
	}

	/** Часть формата под фокусом с её правилом; фокуса нет — `undefined`. */
	protected get _focusedPart(): TFieldPart | undefined {
		const type = this._focusedSegment

		return type === undefined ? undefined : fieldPartOf(type, this._format)
	}

	/**
	 * Текст части под фокусом — с набранным: его меняет и набор, не меняющий
	 * частей. Фокуса нет — `undefined`.
	 */
	protected get _focusedText(): string | undefined {
		const part = this._focusedPart

		return part === undefined ? undefined : textOf(this._parts, this._typed, part)
	}

	/** Править можно: поле не выключено и не только для чтения. */
	protected get _editable(): boolean {
		return !this.disabled && !this.readonly
	}

	/**
	 * Значение сменилось — части за ним. Своя правка оставляет свои части и
	 * набранное, если значение записалось как есть: из него те же части не
	 * собрать (у недописанной даты значения нет вовсе, а время, ушедшее из
	 * значения у поля даты, в частях остаётся). Запись снаружи и поправленная в
	 * `change:value:before` правка берут части из значения, набранные цифры
	 * сбрасываются.
	 *
	 * Ошибка — раньше событий значения: подписчик `change:value` застаёт
	 * атрибуты ошибки уже по новому значению.
	 */
	protected override _valueChanged(oldValue: TDateInputValue): void {
		const pending = this._pending

		this._pending = undefined

		if (pending !== undefined && pending.value === this._value) {
			this._parts = pending.parts
			this._typed = pending.typed
		} else {
			this._parts = partsOfValue(this._value)
			this._typed = ''
		}

		this._invalidChanged(this._invalid || this._outOfRange(oldValue))
		super._valueChanged(oldValue)
		this.events.emit('change:segments')
	}

	/**
	 * Шаг очистки поля (`clear`): пусты все части, и скрытые форматом — время у
	 * поля даты, секунда у точности до минуты, — а набранные цифры сброшены.
	 * Так пустеют и недописанные части, у которых значения нет. Это правка
	 * частей, как Delete: значение снимает сеттер, и запись можно отменить в
	 * `change:value:before`.
	 */
	protected override _clearValue(): void {
		this._commit({})
	}

	/**
	 * Записать правку: части и набранные цифры части под фокусом (`typed`;
	 * правка не набором их сбрасывает) — одним путём. Значение то же — пишутся
	 * только они (`_write`). Иначе значение пишется сеттером: его можно
	 * поправить или отменить в `change:value:before`, а отменённая правка не
	 * трогает ни частей, ни набранного. Возвращает, принята ли правка.
	 */
	protected _commit(next: TDateInputParts, typed = ''): boolean {
		const value = fieldValueOf(next, this._format)

		if (value === this._value) {
			this._write(next, typed)

			return true
		}

		const pending: TDateInputEdit = { parts: next, typed, value }

		this._pending = pending
		this.value = value

		// Сеттер не дошёл до `_valueChanged` — запись отменили
		const accepted = this._pending !== pending

		this._pending = undefined

		return accepted
	}

	/**
	 * Части и набранное без смены значения. `change:segments` — одно, если
	 * сменились части или текст части под фокусом: набранный ноль меняет текст,
	 * не меняя частей. Не сменилось ни то, ни другое — события нет.
	 */
	protected _write(next: TDateInputParts, typed: string): void {
		const text = this._focusedText
		const same = sameParts(next, this._parts)

		this._parts = next
		this._typed = typed

		if (!same || this._focusedText !== text) this.events.emit('change:segments')
	}

	/** Набранный знак — в части; дописать больше некуда — фокус на следующую. */
	protected _enter(entry: TKeyEntry): void {
		if (this._commit(entry.parts, entry.typed) && entry.advance) this.shiftFocus(1)
	}

	/**
	 * Формат сменился — локаль, вид поля или точность времени. Набранные цифры
	 * были в прежнем формате; части под фокусом в новом может не быть (период
	 * суток у 24-часовой локали, время у поля даты, секунда у точности до
	 * минуты) — тогда фокуса в поле нет: её узел разметка сняла вместе с
	 * DOM-фокусом.
	 *
	 * Значение пишется заново, только если те же части в новом формате
	 * собираются иначе, чем в прежнем (`before`): вид поля и точность меняют
	 * форму значения, а цикл часов — нужен ли выбранный период суток. Значение,
	 * записанное снаружи и полем не собранное, смена формата, которая его
	 * прочтение не меняет, не трогает.
	 */
	protected _formatChanged(before: TDateInputValue): void {
		this._write(this._parts, '')

		if (this._focusedSegment !== undefined && this._focusedPart === undefined) {
			this.focusSegment(undefined)
		}
		if (fieldValueOf(this._parts, this._format) !== before) this._commit(this._parts)
	}

	/**
	 * Своя проверка значения: вне `min`/`max` или день отвергает функция
	 * `unavailable`. Значения нет — проверять нечего. Значением, а не полем —
	 * итог до записи считается по прежнему значению.
	 */
	protected _outOfRange(value: TDateInputValue): boolean {
		if (outOfBounds(value, this._min, this._max)) return true

		const date = dateOfValue(value)

		return date !== undefined && Boolean(this._unavailable?.(date, undefined))
	}

	/**
	 * Часть — снимок для разметки: своё ядра и поверх — наборы части
	 * (`segmentSets`). `invalid` — поля, посчитанный на весь снимок.
	 *
	 * Подсказка и `aria-valuetext` — по тексту: набранные нули — не подсказка,
	 * а текст части. `aria-valuenow` — только у части с числом: нули числа не
	 * дают.
	 */
	protected _segment(
		part: TFieldPart,
		format: IDateFieldFormat,
		invalid: boolean,
	): TDateInputPart {
		const { type } = part
		const { min, max } = part.rule.limits(this._parts)
		// Набранное — части под фокусом: у остальных его нет
		const typed = type === this._focusedSegment ? this._typed : ''
		const shown = shownOf(this._parts, part)
		const text = textOf(this._parts, typed, part)
		const empty = emptyPart(this._parts, typed, part)
		const sets = this._segmentSets.get(type)
		// Значение — свойство счётчика: у роли, которую задал набор части
		// (`textbox`), его нет, и значение там — сам текст части
		const counter = (sets?.aria.get('role') ?? SEGMENT_ROLE) === SEGMENT_ROLE

		return {
			key: type,
			type,
			text,
			placeholder: empty,
			name: format.names[type],
			numeric: part.rule.numeric,
			aria: {
				role: SEGMENT_ROLE,
				'aria-label': format.names[type],
				'aria-valuenow': counter && shown !== undefined ? String(shown) : null,
				'aria-valuetext': counter && !empty ? text : null,
				'aria-valuemin': counter ? String(min) : null,
				'aria-valuemax': counter ? String(max) : null,
				'aria-invalid': invalid ? 'true' : null,
				'aria-required': this.required ? 'true' : null,
				'aria-readonly': this.readonly ? 'true' : null,
				'aria-disabled': this.disabled ? 'true' : null,
				// Своя остановка Tab у каждой части; у выключенного поля — ни одной
				tabindex: this.disabled ? null : '0',
				...sets?.aria.toObject(),
			},
			attrs: sets?.attrs.toObject() ?? {},
			dataset: { 'data-type': type, 'data-placeholder': String(empty) },
		}
	}

	/**
	 * Атрибуты ошибки — и у частей: их `aria-invalid` считает снимок
	 * `segments`, и итог, который сменила запись своего, его перечитывает.
	 */
	protected override _syncInvalid(): void {
		super._syncInvalid()
		this.events.emit('change:segments')
	}
}
