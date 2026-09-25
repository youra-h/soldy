import { TValueControl } from '../../base/value-control'
import type { TValueControlStates } from '../../base/value-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { TStateUnit, createScale } from '../../../common'
import type { IScale, TAriaAttributes } from '../../../common'
import type { TSlideEdge, TSlideOrientation, TSlideSnap } from '../slide'
import type {
	ISlider,
	ISliderProps,
	TSliderEvents,
	TSliderGesture,
	TSliderMark,
	TSliderMarks,
	TSliderShownMark,
	TSliderStep,
	TSliderStyle,
	TSliderThumb,
	TSliderValue,
} from './types'

/**
 * «То же самое» для числа, строки и их списков: списки — поэлементно.
 *
 * Им сверяются значение (правило его единицы состояния), шаг и имена ручек:
 * массив, собранный заново с тем же составом, — то же самое значение.
 */
function sameValue(a: unknown, b: unknown): boolean {
	if (a === b) return true

	return (
		Array.isArray(a) &&
		Array.isArray(b) &&
		a.length === b.length &&
		a.every((item, index) => item === b[index])
	)
}

/** Число в отрезке; `NaN` уходит в начало. */
function within(value: number, low: number, high: number): number {
	return value > low ? Math.min(value, high) : low
}

/**
 * Доля хода процентом для CSS — с `%` и без хвоста плавающей точки: 0.3 хода
 * даёт `30%`, а не `30.000000000000004%`.
 */
function percent(fraction: number): string {
	return `${Math.round(fraction * 1e6) / 1e4}%`
}

/**
 * Ползунок: число или несколько чисел, которые задают перетаскиванием,
 * клавишами и жестом скринридера.
 *
 * Ручка — нативный `input[type=range]` в разметке, по полю на значение: так
 * мобильный скринридер двигает её своим жестом, а `name`, `disabled` и
 * отправку формы даёт браузер. ARIA-дублей ядро полям не пишет, как CheckBox
 * и Switch (`_ariaTag` — `input`).
 *
 * Границы слоёв: **значение — здесь, операция — в плагине.**
 *
 * - Шкала (`IScale`) — границы, шаг числом или списком, перевод между
 *   значением и долей хода. Чистая математика из `common/scale`.
 * - Жест и клавиши приходят командами контракта `ISlidable` (`grab`, `press`,
 *   `drag`, `release`, `settle`, `shift`, `moveToEdge`): где указатель и какая
 *   клавиша, знают плагины `TSlidePointerPlugin` и `TSlideKeyboardPlugin`, а
 *   что от этого станет со значением — только ядро.
 * - Щелчок к меткам (`snap`) — стратегия плагина указателя. Ядро держит режим
 *   и радиус и отдаёт доли меток и ручек (`snapPoints`, `fractions`), а куда
 *   встать ручке, решает плагин: радиус в px он переводит в долю по длине
 *   дорожки.
 * - Всё, что зависит от значения, разметка получает выходами — ручки, края
 *   заливки, метки: позиции CSS-переменными, состояния наборами `data-*`.
 *   Считать их в шести адаптерах значило бы шесть раз повторить одну формулу.
 *
 * **Значение хранится как задано**, итог отдаёт резольвер шкалы: прижатое к
 * границам, приведённое к шагу и упорядоченное. Поэтому порядок записи не
 * важен — внешнему `ctrl` сборка пишет `value` раньше `max`, и прижатие к
 * прежнему `max` потеряло бы значение. Смена шкалы — `notify`: итог
 * пересчитан, `change:value` приходит, только если он сменился. Соседей
 * резольвер не раздвигает: зазор между ручками (`minStepsBetweenThumbs`)
 * держат жест и клавиши, а поле получает границы, в которых его значение
 * всегда лежит.
 */
export default class TSlider
	extends TValueControl<TSliderValue, ISliderProps, TSliderEvents>
	implements ISlider
{
	static override baseClass = 's-slider'

	static defaultValues: typeof TValueControl.defaultValues &
		TDefaultValues<
			ISliderProps,
			| 'min'
			| 'max'
			| 'step'
			| 'largeStep'
			| 'orientation'
			| 'inverted'
			| 'marks'
			| 'minStepsBetweenThumbs'
			| 'snap'
			| 'snapRadius',
			'origin' | 'thumbLabels'
		> = {
		...TValueControl.defaultValues,
		// Ползунок кладут в подпись `Label`, а внутри `label` HTML разрешает
		// только строчную разметку
		tag: 'span',
		value: 0,
		min: 0,
		max: 100,
		step: 1,
		largeStep: 10,
		orientation: 'horizontal',
		inverted: false,
		origin: undefined,
		marks: false,
		minStepsBetweenThumbs: 0,
		thumbLabels: undefined,
		snap: 'none',
		// Зона метки — 16 px: шире притяжения поля с `<datalist>` в Chromium
		// (5 px), но уже промежутка между метками на ползунке обычной длины
		snapRadius: 8,
	}

	protected _min: number
	protected _max: number
	protected _step: TSliderStep
	protected _scale: IScale
	protected _largeStep: number
	protected _orientation!: TSlideOrientation
	protected _inverted: boolean
	protected _origin: number | undefined
	protected _marks: TSliderMarks
	protected _minStepsBetweenThumbs: number
	protected _thumbLabels: string[] | undefined
	protected _snap: TSlideSnap
	protected _snapRadius: number
	protected _dragging = false
	protected _activeThumb: number | undefined = undefined
	protected _gesture: TSliderGesture | undefined = undefined

	constructor(
		props: Partial<ISliderProps> = {},
		options: IComponentOptions<TValueControlStates<TSliderValue>> = {},
	) {
		const ctor = new.target as typeof TSlider
		const initial: TSliderValue = props.value ?? ctor.defaultValues.value

		// Значение сверяется поэлементно: резольвер собирает массив ручек
		// заново на каждое чтение, и по ссылке итог менялся бы всегда
		const value = new TStateUnit<TSliderValue>({ initial, same: sameValue })

		super(props, { ...options, states: { value, ...options.states } })

		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._step = props.step ?? ctor.defaultValues.step
		this._scale = this._createScale()
		this._largeStep = props.largeStep ?? ctor.defaultValues.largeStep
		this._inverted = props.inverted ?? ctor.defaultValues.inverted
		this._origin = props.origin ?? ctor.defaultValues.origin
		this._marks = props.marks ?? ctor.defaultValues.marks
		this._minStepsBetweenThumbs =
			props.minStepsBetweenThumbs ?? ctor.defaultValues.minStepsBetweenThumbs
		this._thumbLabels = props.thumbLabels ?? ctor.defaultValues.thumbLabels
		this._snap = props.snap ?? ctor.defaultValues.snap
		this._snapRadius = props.snapRadius ?? ctor.defaultValues.snapRadius

		this._applyOrientation(props.orientation ?? ctor.defaultValues.orientation)

		// С первой отрисовки и значением `"false"`: тема отличает «не тянут»
		// от «неприменимо»
		this._dataset.add('dragging', this._dragging)

		this._states.value.setResolver((raw) => this._normalize(raw))
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	get min(): number {
		return this._min
	}

	set min(value: number) {
		if (this._min === value) return

		this._rescale(() => {
			this._min = value
		})
		this.events.emit('change:min', value)
	}

	get max(): number {
		return this._max
	}

	set max(value: number) {
		if (this._max === value) return

		this._rescale(() => {
			this._max = value
		})
		this.events.emit('change:max', value)
	}

	get step(): TSliderStep {
		return this._step
	}

	set step(value: TSliderStep) {
		if (sameValue(this._step, value)) return

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

	get orientation(): TSlideOrientation {
		return this._orientation
	}

	set orientation(value: TSlideOrientation) {
		if (this._orientation === value) return

		this._applyOrientation(value, this._orientation)
		this.events.emit('change:orientation', value)
	}

	get inverted(): boolean {
		return this._inverted
	}

	set inverted(value: boolean) {
		if (this._inverted === value) return

		this._inverted = value
		this.events.emit('change:inverted', value)
	}

	get origin(): number | undefined {
		return this._origin
	}

	set origin(value: number | undefined) {
		if (this._origin === value) return

		this._origin = value
		this.events.emit('change:origin', value)
	}

	/**
	 * Список меток принадлежит потребителю и сверяется по ссылке: менять его
	 * на месте нельзя (AGENTS.md, «Контракт границы core → ui»).
	 */
	get marks(): TSliderMarks {
		return this._marks
	}

	set marks(value: TSliderMarks) {
		if (this._marks === value) return

		this._marks = value
		this.events.emit('change:marks', value)
	}

	get minStepsBetweenThumbs(): number {
		return this._minStepsBetweenThumbs
	}

	set minStepsBetweenThumbs(value: number) {
		if (this._minStepsBetweenThumbs === value) return

		this._minStepsBetweenThumbs = value
		this.events.emit('change:minStepsBetweenThumbs', value)
	}

	get thumbLabels(): string[] | undefined {
		return this._thumbLabels
	}

	set thumbLabels(value: string[] | undefined) {
		if (sameValue(this._thumbLabels, value)) return

		this._thumbLabels = value
		this.events.emit('change:thumbLabels', value)
	}

	get snap(): TSlideSnap {
		return this._snap
	}

	set snap(value: TSlideSnap) {
		if (this._snap === value) return

		this._snap = value
		this.events.emit('change:snap', value)
	}

	get snapRadius(): number {
		return this._snapRadius
	}

	set snapRadius(value: number) {
		if (this._snapRadius === value) return

		this._snapRadius = value
		this.events.emit('change:snapRadius', value)
	}

	/** Идёт перетаскивание: с первого движения после нажатия до отпускания. */
	get dragging(): boolean {
		return this._dragging
	}

	/* ------------------------------------------------------------------ */
	/* Перетаскивание (`ISlidable`)                                       */
	/* ------------------------------------------------------------------ */

	/** Значения ручек по возрастанию. Снимок: резольвер собирает его заново. */
	get values(): number[] {
		const value = this.value

		return Array.isArray(value) ? value : [value]
	}

	/** Доли хода ручек в направлении роста: `inverted` их не переворачивает. */
	get fractions(): number[] {
		return this.values.map((value) => this._scale.fraction(value))
	}

	/**
	 * Точки щелчка — доли показанных меток: вне хода метки нет и на экране.
	 * Список меток задаёт потребитель в любом порядке и с повторами, а
	 * стратегиям щелчка нужен упорядоченный.
	 */
	get snapPoints(): number[] {
		const fractions = this._markList().map(({ value }) => this._scale.fraction(value))

		return [...new Set(fractions)].sort((a, b) => a - b)
	}

	get activeThumb(): number | undefined {
		return this._activeThumb
	}

	grab(index: number, fraction: number): boolean {
		const values = this.values

		if (this.disabled || !isIndexOf(values, index)) return false

		// Ручка идёт за указателем со смещением захвата: взялись за её край —
		// значение не прыгает к точке нажатия
		const offset = this._scale.fraction(values[index]) - fraction
		const [lo, hi] = this._group(values, index)

		this._begin(fraction, offset, index, lo, hi)

		return true
	}

	press(fraction: number): boolean {
		const values = this.values

		if (this.disabled || values.length === 0) return false

		const target = this._scale.valueAt(fraction)
		const [lo, hi] = this._group(values, this._nearest(values, target))
		const shared = values[lo]

		// У ручек на одном значении направление видно по точке нажатия: к
		// меньшим идёт первая из них, к большим — последняя. Нажали ровно в их
		// значение — решит первое движение
		if (target === shared) {
			this._begin(fraction, 0, hi, lo, hi)
		} else {
			const index = target < shared ? lo : hi

			this._begin(fraction, 0, index, index, index)
			this._moveThumb(values, index, target)
		}

		return true
	}

	drag(fraction: number): void {
		const gesture = this._gesture

		if (!gesture || this._activeThumb === undefined) return

		// До первого движения жест — ещё нажатие: `dragging` не стоит, и прыжок
		// ручки к месту нажатия тема анимирует
		if (!this._dragging) {
			if (fraction === gesture.from) return

			this._activeThumb = fraction < gesture.from ? gesture.lo : gesture.hi
			this._setDragging(true)
		}

		this._moveThumb(
			this.values,
			this._activeThumb,
			this._scale.valueAt(fraction + gesture.offset),
		)
	}

	release(): void {
		const gesture = this._finish()

		if (gesture) this._commit(gesture.before)
	}

	settle(fraction: number): void {
		const index = this._activeThumb
		const gesture = this._finish()

		if (!gesture || index === undefined) return

		// Перетаскивания уже нет: ручку до метки довозит переход темы
		this._moveThumb(this.values, index, this._scale.valueAt(fraction))
		this._commit(gesture.before)
	}

	shift(index: number, count: number): void {
		const values = this.values

		if (this.disabled || !isIndexOf(values, index)) return

		const before = this.value

		this._moveThumb(values, index, this._scale.shift(values[index], count))
		this._commit(before)
	}

	moveToEdge(index: number, edge: TSlideEdge): void {
		const values = this.values

		if (this.disabled || !isIndexOf(values, index)) return

		const [lower, upper] = this._bounds(values, index)
		const before = this.value

		this._moveThumb(values, index, edge === 'start' ? lower : upper)
		this._commit(before)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * Ручки: значение, границы и шаг поля, позиция, состояние и имя. Своего
	 * экземпляра у ручки нет, поэтому её наборы отдаются значением — как
	 * `list_aria` у списка Select.
	 */
	get thumbs(): TSliderThumb[] {
		const values = this.values
		const dragged = this._dragging ? this._activeThumb : undefined
		const step = this._scale.interval ?? 'any'

		return values.map((value, index) => {
			const [min, max] = this._bounds(values, index)
			const label = this._thumbLabels?.[index]
			const aria: TAriaAttributes = label === undefined ? {} : { 'aria-label': label }

			return {
				value,
				min,
				max,
				step,
				style: { '--s-slider-position': this._position(value) },
				dataset: { 'data-dragging': String(index === dragged) },
				aria,
			}
		})
	}

	/** Края заливки — начало не дальше конца, от начала оси. */
	get rangeStyle(): TSliderStyle {
		const [from, to] = this._range(this.values)
		const start = this._axis(from)
		const end = this._axis(to)

		return {
			'--s-slider-range-start': percent(Math.min(start, end)),
			'--s-slider-range-end': percent(Math.max(start, end)),
		}
	}

	/**
	 * Метки на рельсе: позиция, подпись и состояния. Метка списка вне хода не
	 * показывается — ей негде стоять.
	 */
	get shownMarks(): TSliderShownMark[] {
		const values = this.values
		const [from, to] = this._range(values)

		return this._markList().map(({ value, label }) => ({
			value,
			label,
			style: { '--s-slider-position': this._position(value) },
			dataset: {
				'data-in-range': String(value >= from && value <= to),
				'data-current': String(values.includes(value)),
			},
		}))
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	protected _createScale(): IScale {
		return createScale({ min: this._min, max: this._max, step: this._step })
	}

	/**
	 * Сменить шкалу. Хранимое значение не трогается — пересчитывается итог, и
	 * `change:value` приходит, только если он сменился.
	 */
	protected _rescale(apply: () => void): void {
		const before = this.value

		apply()
		this._scale = this._createScale()
		this._states.value.notify(before)
	}

	/** Итог значения: форма та же, значения на шкале и по возрастанию. */
	protected _normalize(raw: TSliderValue): TSliderValue {
		if (!Array.isArray(raw)) return this._scale.snap(raw)

		return raw.map((value) => this._scale.snap(value)).sort((a, b) => a - b)
	}

	protected _applyOrientation(newValue: TSlideOrientation, oldValue?: TSlideOrientation): void {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		// Не для вида: по ориентации скринридер объявляет, какими стрелками
		// двигать ручку. Набор уходит на каждое поле
		this._aria.add('aria-orientation', newValue)
		this._orientation = newValue
	}

	protected _setDragging(value: boolean): void {
		if (this._dragging === value) return

		this._dragging = value
		this._dataset.add('dragging', value)
		this.events.emit('change:dragging', value)
	}

	protected _begin(from: number, offset: number, index: number, lo: number, hi: number): void {
		// Указатель у ползунка один: новый жест закрывает незаконченный
		this.release()

		this._gesture = { from, offset, lo, hi, before: this.value }
		this._activeThumb = index
	}

	/**
	 * Закончить жест: ручку отпустили, перетаскивания нет. Отдаёт законченный
	 * жест — с ним значение до жеста для `commit`; жеста не было — `undefined`.
	 */
	protected _finish(): TSliderGesture | undefined {
		const gesture = this._gesture

		this._gesture = undefined
		this._activeThumb = undefined
		this._setDragging(false)

		return gesture
	}

	/**
	 * Поставить ручку в `target` в пределах её хода. Значение пишется в той
	 * форме, в какой задано: число остаётся числом.
	 */
	protected _moveThumb(values: readonly number[], index: number, target: number): void {
		const [lower, upper] = this._bounds(values, index)
		const next = within(target, lower, upper)

		if (next === values[index]) return

		const moved = [...values]

		moved[index] = next
		this.value = Array.isArray(this._states.value.rawValue) ? moved : next
	}

	/**
	 * Ход ручки: от соседа слева до соседа справа с зазором
	 * `minStepsBetweenThumbs`, у крайних — до края шкалы. Значение ручки лежит
	 * внутри всегда: если соседи уже ближе зазора, ручка не прыгает, а только
	 * не может подойти ближе.
	 */
	protected _bounds(values: readonly number[], index: number): [number, number] {
		const value = values[index]
		const gap = Math.max(0, this._minStepsBetweenThumbs)
		const lower = index > 0 ? this._scale.shift(values[index - 1], gap) : this._scale.first
		const upper =
			index < values.length - 1
				? this._scale.shift(values[index + 1], -gap)
				: this._scale.last

		return [Math.min(lower, value), Math.max(upper, value)]
	}

	/** Ручки на одном значении с ручкой `index` — первая и последняя: список упорядочен. */
	protected _group(values: readonly number[], index: number): [number, number] {
		let lo = index
		let hi = index

		while (lo > 0 && values[lo - 1] === values[index]) lo--
		while (hi < values.length - 1 && values[hi + 1] === values[index]) hi++

		return [lo, hi]
	}

	/** Ближайшая к значению ручка; поровну от двух — меньшая. */
	protected _nearest(values: readonly number[], target: number): number {
		let nearest = 0

		for (let index = 1; index < values.length; index++) {
			if (Math.abs(values[index] - target) < Math.abs(values[nearest] - target)) {
				nearest = index
			}
		}

		return nearest
	}

	/** Края заливки значениями: у одной ручки — от `origin`, у нескольких — между крайними. */
	protected _range(values: readonly number[]): [number, number] {
		if (values.length > 1) return [values[0], values[values.length - 1]]

		const origin = within(this._origin ?? this._scale.min, this._scale.min, this._scale.max)
		const value = values.length === 1 ? values[0] : origin

		return [Math.min(origin, value), Math.max(origin, value)]
	}

	/** Метки, которым есть где стоять: точки шкалы или свой список в пределах хода. */
	protected _markList(): TSliderMark[] {
		const marks = this._marks

		if (marks === true) return this._scale.points.map((value) => ({ value }))
		if (marks === false) return []

		return marks.filter(({ value }) => value >= this._scale.min && value <= this._scale.max)
	}

	/** Доля хода от начала оси: `inverted` её переворачивает. */
	protected _axis(value: number): number {
		const fraction = this._scale.fraction(value)

		return this._inverted ? 1 - fraction : fraction
	}

	protected _position(value: number): string {
		return percent(this._axis(value))
	}

	protected _commit(before: TSliderValue): void {
		const after = this.value

		if (sameValue(before, after)) return

		this.events.emit('commit', { newValue: after, oldValue: before })
	}

	/**
	 * `aria` стоит на полях ручек, а не на корне: `disabled` у них нативный, и
	 * `aria-disabled` рядом был бы дублем.
	 */
	protected override get _ariaTag(): string {
		return 'input'
	}

	override getProps(): ISliderProps {
		return {
			...super.getProps(),
			min: this._min,
			max: this._max,
			step: this._step,
			largeStep: this._largeStep,
			orientation: this._orientation,
			inverted: this._inverted,
			origin: this._origin,
			marks: this._marks,
			minStepsBetweenThumbs: this._minStepsBetweenThumbs,
			thumbLabels: this._thumbLabels,
			snap: this._snap,
			snapRadius: this._snapRadius,
		}
	}
}

/** Есть ли у списка ручка с таким номером. */
function isIndexOf(values: readonly number[], index: number): boolean {
	return Number.isInteger(index) && index >= 0 && index < values.length
}
