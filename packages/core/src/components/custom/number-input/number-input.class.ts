import { TClearable } from '../../base/clearable'
import type { TDefaultValues } from '../../base/component'
import { DEFAULT_LOCALE, TAria, TAttributes, TDataset, createScale } from '../../../common'
import { sameValue } from '../../../common/utility/same-value'
import type { IScale, TAriaAttributes, TAttributesMap } from '../../../common'
import { syncTextFieldAria } from '../input/aria'
import { numberFormat } from './format'
import type { INumberFormat } from './format'
import type {
	INumberInput,
	INumberInputProps,
	TNumberInputEdge,
	TNumberInputEdit,
	TNumberInputEvents,
	TNumberInputFormatOptions,
	TNumberInputSets,
	TNumberInputValue,
} from './types'

/**
 * Роль поля — счётчик (APG, Spinbutton): ↑/↓ меняют число, значение и границы
 * скринридер читает из `aria-value*`. Набор поля её заменяет там, где счётчик
 * недоступен (`textbox` на сенсорных устройствах Apple).
 */
const INPUT_ROLE = 'spinbutton'

/** Опции формата — по содержимому: значения у них простые, а объект собирают заново. */
function sameOptions(
	a: TNumberInputFormatOptions | undefined,
	b: TNumberInputFormatOptions | undefined,
): boolean {
	if (a === b) return true
	if (a === undefined || b === undefined) return false

	const entries = Object.entries(a)

	return (
		entries.length === Object.keys(b).length &&
		entries.every(([key, value]) => Object.hasOwn(b, key) && Reflect.get(b, key) === value)
	)
}

/**
 * Поле числа: число в формате языка страницы, шаг и границы, ↑/↓ и кнопки
 * «меньше» и «больше» (APG, Spinbutton на текстовом поле).
 *
 * **Значение — число, текст — его представление.** Значение хранится как
 * задано, итог отдаёт геттер — прижатым к `min` и `max`, как у Slider, но не
 * приведённым к шагу: набранное число к сетке не тянут. Не число — пусто.
 *
 * **Текст — буфер правки**, как части поля даты. Пока набирают, в нём
 * набранное как есть («1234,» — без групп и с запятой на конце), и `value`
 * пишется на каждый набранный знак, пока в тексте число; недописанное («-») —
 * пусто. Эхо своей записи (`v-model` вернул то же или итог) текст не трогает;
 * запись снаружи, сменившая итог, и смена формата пишут текст из значения.
 * Отменили `change:value:before` — правки нет, поправили — текст показывает
 * итог.
 *
 * **Действие закрывает `commit()`** — уход фокуса, Enter, шаг клавишей,
 * отпущенная кнопка шага. Значение становится тем, что видно: с точностью
 * формата (1,23456 при трёх знаках — 1,235), текст — строкой формата
 * («1 234,5»). Событие `commit` — одно на действие, если оно сменило
 * значение, как у Slider. Шаг действия не закрывает: удержание кнопки
 * шагает подряд, и закрывает его отпускание. Очистка — тоже законченное
 * действие.
 *
 * **Шаг — по шкале** (`IScale`), не своей математикой: шкала открытая — без
 * `min` и `max` её стороны бесконечны, — сетка от `min`, без него — от нуля,
 * как у нативного поля. Первый шаг — к соседнему узлу (с 2,5 при шаге 1 —
 * вверх на 3, вниз на 2), с пустого — вверх к `min`, вниз к `max`, без
 * границы — к нулю. У края шага в его сторону нет, и кнопка выключена.
 *
 * **Формат — от `locale` и `formatOptions`** (`numberFormat`): текст,
 * разбор и правило набора — минус, только если `min` не задан или меньше
 * нуля, десятичный разделитель — у формата с дробью. Клавиш и указателя ядро
 * не знает: их переводят в команды плагины.
 *
 * Разметка: ARIA счётчика — набором `inputAria` на вложенном `<input>`,
 * `dir` и `lang` числа — набором `inputAttrs`, имя и ошибка — общим `aria`
 * (`_ariaTag` — `input`). У кнопок шага своего экземпляра нет — их наборы
 * держит поле, как набор кнопки очистки.
 */
export class TNumberInput
	extends TClearable<TNumberInputValue, INumberInputProps, TNumberInputEvents>
	implements INumberInput
{
	static override baseClass = 'so-number-input'

	static defaultValues: typeof TClearable.defaultValues &
		TDefaultValues<
			INumberInputProps,
			'step' | 'largeStep' | 'placeholder' | 'locale',
			'min' | 'max' | 'formatOptions'
		> = {
		...TClearable.defaultValues,
		min: undefined,
		max: undefined,
		step: 1,
		largeStep: 10,
		formatOptions: undefined,
		placeholder: '',
		// Язык задаёт приложение (плагин языка), а до него — английский, как у
		// поля даты
		locale: DEFAULT_LOCALE,
	}

	protected _min: number | undefined
	protected _max: number | undefined
	protected _step: number
	protected _largeStep: number
	protected _formatOptions: TNumberInputFormatOptions | undefined
	protected _placeholder: string
	protected _locale: string
	protected _scale: IScale
	protected _numberFormat: INumberFormat
	protected _text: string
	/** Итог, с которого началось действие: по нему `commit` решает, сменилось ли значение */
	protected _committed: TNumberInputValue
	/** Своя правка, которую сейчас пишет сеттер `value` */
	private _pending: TNumberInputEdit | undefined = undefined
	private readonly _decrementAria: TAria
	private readonly _incrementAria: TAria
	private readonly _decrementDataset: TDataset
	private readonly _incrementDataset: TDataset
	private readonly _inputSets: TNumberInputSets

	constructor(props: Partial<INumberInputProps> = {}) {
		const ctor = new.target as typeof TNumberInput

		super(props)

		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._step = props.step ?? ctor.defaultValues.step
		this._largeStep = props.largeStep ?? ctor.defaultValues.largeStep
		this._formatOptions = props.formatOptions ?? ctor.defaultValues.formatOptions
		this._placeholder = props.placeholder ?? ctor.defaultValues.placeholder
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._scale = this._createScale()
		this._numberFormat = numberFormat(this._locale, this._formatOptions)
		this._text = this._numberFormat.format(this.value)
		this._committed = this.value

		// Кнопки шага — не остановки Tab: число меняют ↑/↓ во вводе, а кнопки —
		// для указателя и скринридера
		this._decrementAria = new TAria({ tabindex: '-1' })
		this._decrementAria.subscribe(() =>
			this.events.emit('change:decrementAria', this._decrementAria.toObject()),
		)
		this._incrementAria = new TAria({ tabindex: '-1' })
		this._incrementAria.subscribe(() =>
			this.events.emit('change:incrementAria', this._incrementAria.toObject()),
		)

		this._decrementDataset = new TDataset()
		this._decrementDataset.subscribe(() =>
			this.events.emit('change:decrementDataset', this._decrementDataset.toObject()),
		)
		this._incrementDataset = new TDataset()
		this._incrementDataset.subscribe(() =>
			this.events.emit('change:incrementDataset', this._incrementDataset.toObject()),
		)

		this._inputSets = { aria: new TAria(), attrs: new TAttributes() }

		// Both sets of the input report one `change:inputSets`, without a snapshot
		const inputSetsChanged = () => this.events.emit('change:inputSets')

		this._inputSets.aria.subscribe(inputSetsChanged)
		this._inputSets.attrs.subscribe(inputSetsChanged)
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	/** Итог: своё число, прижатое к `min` и `max`. Не число — пусто. */
	override get value(): TNumberInputValue {
		const raw = this._value

		if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined

		return Math.min(Math.max(raw, this._scale.min), this._scale.max)
	}
	override set value(value: TNumberInputValue) {
		super.value = value
	}

	get min(): number | undefined {
		return this._min
	}

	set min(value: number | undefined) {
		if (this._min === value) return

		this._rescale(() => {
			this._min = value
		})
		this.events.emit('change:min', value)
	}

	/** Меньше `min` — граница схлопывается в `min`, как у шкалы. */
	get max(): number | undefined {
		return this._max
	}

	set max(value: number | undefined) {
		if (this._max === value) return

		this._rescale(() => {
			this._max = value
		})
		this.events.emit('change:max', value)
	}

	get step(): number {
		return this._step
	}

	set step(value: number) {
		if (this._step === value) return

		this._rescale(() => {
			this._step = value
		})
		this.events.emit('change:step', value)
	}

	get largeStep(): number {
		return this._largeStep
	}

	set largeStep(value: number) {
		if (this._largeStep === value) return

		this._largeStep = value
		this.events.emit('change:largeStep', value)
	}

	/**
	 * Сверяются по содержимому: те же опции новым объектом — не смена. Формат
	 * и текст — до события, как шкала у `min`: подписчик `change:formatOptions`
	 * читает `text`, `inputAria` и `inputAttrs` уже в новом формате.
	 */
	get formatOptions(): TNumberInputFormatOptions | undefined {
		return this._formatOptions
	}

	set formatOptions(value: TNumberInputFormatOptions | undefined) {
		if (sameOptions(this._formatOptions, value)) return

		this._formatOptions = value
		this._formatChanged()
		this.events.emit('change:formatOptions', value)
	}

	get placeholder(): string {
		return this._placeholder
	}

	set placeholder(value: string) {
		if (this._placeholder === value) return

		this._placeholder = value
		this.events.emit('change:placeholder', value)
	}

	get locale(): string {
		return this._locale
	}

	/**
	 * Значение то же; текст — строкой нового формата. Формат и текст — до
	 * события, как у `formatOptions`.
	 */
	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this._formatChanged()
		this.events.emit('change:locale', value)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	get text(): string {
		return this._text
	}

	get signed(): boolean {
		return this._scale.min < 0
	}

	get decrementDisabled(): boolean {
		const value = this.value

		return !this._editable || (value !== undefined && value <= this._scale.first)
	}

	get incrementDisabled(): boolean {
		const value = this.value

		return !this._editable || (value !== undefined && value >= this._scale.last)
	}

	get decrementAria(): TAria {
		return this._decrementAria
	}

	get incrementAria(): TAria {
		return this._incrementAria
	}

	get decrementDataset(): TDataset {
		return this._decrementDataset
	}

	get incrementDataset(): TDataset {
		return this._incrementDataset
	}

	get inputSets(): TNumberInputSets {
		return this._inputSets
	}

	/**
	 * Значение — свойство счётчика: у роли, которую задал набор поля
	 * (`textbox`), его нет, и значение там — сам текст. Число в
	 * `aria-valuetext` — строкой формата: «12 %», а не «0.12». Границы — только
	 * заданные: у открытой стороны их нет.
	 */
	get inputAria(): TAriaAttributes {
		const sets = this._inputSets.aria
		const counter = (sets.get('role') ?? INPUT_ROLE) === INPUT_ROLE
		const value = counter ? this.value : undefined
		const { min, max } = this._scale

		return {
			role: INPUT_ROLE,
			'aria-valuenow': value === undefined ? null : String(value),
			'aria-valuetext': value === undefined ? null : this._numberFormat.format(value),
			'aria-valuemin': counter && Number.isFinite(min) ? String(min) : null,
			'aria-valuemax': counter && Number.isFinite(max) ? String(max) : null,
			...sets.toObject(),
		}
	}

	/**
	 * `dir` — направление числа в формате, а не поля: у `ru-RU` валюта стоит
	 * после числа и в поле справа налево, у `he-IL` — по-своему и в поле слева
	 * направо. Где стоит число в поле, решает тема. `lang` — язык формата.
	 * `inputmode` — экранная клавиатура: с десятичным разделителем, только
	 * если формат даёт дробь.
	 */
	get inputAttrs(): TAttributesMap {
		const format = this._numberFormat

		return {
			dir: format.direction,
			lang: format.lang,
			inputmode: format.fraction ? 'decimal' : 'numeric',
			...this._inputSets.attrs.toObject(),
		}
	}

	/* ------------------------------------------------------------------ */
	/* Команды                                                            */
	/* ------------------------------------------------------------------ */

	acceptsText(text: string): boolean {
		return this._numberFormat.accepts(text, this.signed)
	}

	typeText(text: string): boolean {
		if (!this._editable || !this.acceptsText(text)) return false

		return this._edit(this._numberFormat.parse(text), text)
	}

	shift(count: number): void {
		const steps = Math.round(count) || 0

		if (!this._editable || steps === 0) return

		const value = this.value

		if (value === undefined) {
			const edge = steps > 0 ? this._scale.first : this._scale.last

			this._editTo(Number.isFinite(edge) ? edge : this._scale.snap(0))

			return
		}

		if (steps > 0 ? this.incrementDisabled : this.decrementDisabled) return

		this._editTo(this._scale.shift(value, steps))
	}

	moveToEdge(edge: TNumberInputEdge): void {
		if (!this._editable) return

		const bound = edge === 'start' ? this._scale.min : this._scale.max

		if (Number.isFinite(bound)) this._editTo(bound)
	}

	commit(): void {
		if (!this._editable) return

		const value = this.value
		const shown =
			value === undefined
				? undefined
				: this._numberFormat.parse(this._numberFormat.format(value))

		this._editTo(shown ?? value)
		this._settle()
	}

	override getProps(): INumberInputProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			step: this._step,
			largeStep: this._largeStep,
			formatOptions: this._formatOptions,
			placeholder: this._placeholder,
			locale: this._locale,
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Править можно: поле не выключено и не только для чтения. */
	protected get _editable(): boolean {
		return !this.disabled && !this.readonly
	}

	/**
	 * Шкала шага: открытая с той стороны, где границы нет. Сетка — от `min`,
	 * без него — от нуля.
	 */
	protected _createScale(): IScale {
		return createScale({
			min: this._min ?? -Infinity,
			max: this._max ?? Infinity,
			step: this._step,
		})
	}

	/**
	 * Сменить шкалу. Хранимое значение не трогается — пересчитывается итог, и
	 * `change:value` приходит, только если он сменился: тогда и текст — из
	 * нового итога.
	 */
	protected _rescale(apply: () => void): void {
		const before = this.value

		apply()
		this._scale = this._createScale()
		this._valueChanged(before)
	}

	/** Формат сменился — локаль или опции: текст — строкой нового формата. */
	protected _formatChanged(): void {
		this._numberFormat = numberFormat(this._locale, this._formatOptions)
		this._setText(this._numberFormat.format(this.value))
	}

	/** Правка значением: текст — его строкой формата. */
	protected _editTo(value: TNumberInputValue): void {
		this._edit(value, this._numberFormat.format(value))
	}

	/**
	 * Записать правку: текст и значение из него — одним путём. Значение то же —
	 * пишется только текст. Иначе значение пишется сеттером: его можно
	 * поправить или отменить в `change:value:before`, а отменённая правка не
	 * трогает и текста. Возвращает, принята ли правка.
	 */
	protected _edit(value: TNumberInputValue, text: string): boolean {
		if (sameValue(value, this._value)) {
			this._setText(text)

			return true
		}

		const pending: TNumberInputEdit = { text, value }

		this._pending = pending
		this.value = value

		// Сеттер не дошёл до `_valueChanged` — запись отменили
		const accepted = this._pending !== pending

		this._pending = undefined

		return accepted
	}

	/**
	 * Итог мог смениться. Своя правка, записанная как есть, оставляет свой
	 * текст: набранное «1234,» — не «1 234». Поправленная в
	 * `change:value:before` правка и запись снаружи, сменившая итог, пишут текст
	 * из значения; запись снаружи начинает и новое действие — от её итога
	 * `commit` и считает. Эхо — запись, итог не сменившая, — текста не трогает:
	 * `v-model` вернул то, что поле само отдало, и набранное «150» при `max`
	 * 100 не превращается в «100» под пальцем.
	 */
	protected override _valueChanged(oldValue: TNumberInputValue): void {
		const pending = this._pending

		this._pending = undefined

		if (pending !== undefined && pending.value === this._value) {
			this._setText(pending.text)
		} else if (pending !== undefined || !sameValue(this.value, oldValue)) {
			this._setText(this._numberFormat.format(this.value))

			if (pending === undefined) this._committed = this.value
		}

		super._valueChanged(oldValue)
	}

	/**
	 * Шаг очистки поля (`clear`): пусто и значение, и текст — набранное тоже.
	 * Это правка, как набор: значение снимает сеттер, и запись можно отменить в
	 * `change:value:before`. Очистка — законченное действие: `commit`, если
	 * значение было.
	 */
	protected override _clearValue(): void {
		this._edit(undefined, '')
		this._settle()
	}

	/** Действие закончено: `commit`, если оно сменило итог; следующее — от него. */
	protected _settle(): void {
		const before = this._committed
		const after = this.value

		this._committed = after

		if (!sameValue(before, after))
			this.events.emit('commit', { newValue: after, oldValue: before })
	}

	protected _setText(text: string): void {
		if (this._text === text) return

		this._text = text
		this.events.emit('change:text', text)
	}

	/**
	 * `aria` поля стоит на вложенном `<input>`, а не на корне: корень — коробка
	 * со слотами и кнопками шага, а тег поля внутри неё фиксирован.
	 */
	protected override get _ariaTag(): string {
		return 'input'
	}

	/** Обязательность и «только для чтения» — правилом текстового поля, как у Input. */
	protected override _syncInputAccessibility(): void {
		syncTextFieldAria(this._aria, this._ariaTag, this.required, this.readonly)
	}
}
