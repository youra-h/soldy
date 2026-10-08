import { TInputControl } from '../../base/input-control'
import type { TDefaultValues } from '../../base/component'
import type { TSwipe, TSwipeSide } from '../../base/layer'
import { DEFAULT_LOCALE, TAria, compareDates, parseDate } from '../../../common'
import { sameValue } from '../../../common/utility/same-value'
import type {
	TAriaAttributes,
	TCalendarDate,
	TComponentSize,
	TComponentVariant,
	TDatasetAttributes,
	TValuePayload,
	TWeekday,
} from '../../../common'
import { TCalendar, createEngineCalendar } from '../calendar'
import type {
	ICalendar,
	TCalendarCollection,
	TCalendarUnavailable,
	TCalendarValue,
} from '../calendar'
import { TDateInput } from '../date-input'
import type { IDateInput } from '../date-input'
import { TRangeFields, TSingleFields } from './fields'
import type { IDatePickerFields, TDatePickerFieldSet, TDatePickerFieldsMap } from './fields'
import type {
	IDatePicker,
	IDatePickerProps,
	TDatePickerEvents,
	TDatePickerMode,
	TDatePickerSide,
	TDatePickerValue,
} from './types'

/** Поля на режим — стратегию заводит сеттер `mode`. */
const FIELDS: TDatePickerFieldsMap = {
	single: TSingleFields,
	range: TRangeFields,
}

/** Стороны значения — куда DatePicker раскладывает своё. */
const SIDES: readonly TDatePickerSide[] = ['calendar', 'fields']

/**
 * Поле даты и календарь в панели, как Select — поле и список.
 *
 * **Экземпляры — на всю жизнь DatePicker.** Поля (`field` — одна дата,
 * `start` и `end` — концы диапазона), календарь и движок его коллекции
 * создаёт он сам и отдаёт разметке целиком, как Select — `field`, а расширение
 * `picker` календаря — ListBox панели месяцев. Подписки на них прямые. Движок
 * DatePicker держит, потому что зовёт команды его расширений: открытие ставит
 * фокус сетки на старт (`resetFocus`), закрытие снимает начатый диапазон
 * (`cancelRange`), а выбор пользователя (`choose`) закрывает панель.
 *
 * **Общее — вниз, от ядра.** `disabled`, `size`, `variant`, `locale`, `min`,
 * `max` и `unavailable` DatePicker отдаёт полям и календарю, `readonly` и
 * `required` — полям, `weekStart` и `timeZone` — календарю, `name` — полю
 * одной даты, `startName` и `endName` — полям концов, режим — выбору
 * коллекции. Разметка эти значения не пробрасывает: второй путь к тем же
 * данным разошёлся бы с первым. Строк библиотеки DatePicker не строит и вниз
 * не раздаёт: имя кнопки календаря (оно же имя панели) в наборы `triggerAria`
 * и `panelAria` и имена полей концов диапазона даёт его плагин имён
 * (`TDatePickerNamesPlugin`), а поля и календарь, смонтированные своими
 * компонентами, получают имена от своих плагинов имён, как поле Select.
 *
 * **Поле помечает ошибкой то, что не даст выбрать календарь**, и набранное не
 * прижимает: дату вне границ и недоступную, а конец диапазона — ещё и раньше
 * начала. Конец сверяется с набранным началом, как второй день в календаре —
 * с якорем: начало — его `min`, а правило недоступности он получает с якорем
 * «начало». Сменились начало, правило или границы — сверка конца пересобрана.
 *
 * **Значение одно, сторон две** — календарь и поля режима (`IDatePickerFields`,
 * стратегия на режим, как выбор у календаря). Своё значение уходит на обе
 * стороны, правка одной — через него на другую. В сторону-источник оно не
 * возвращается: недонабранный конец диапазона значения не даёт, но и
 * набранного не стирает. Отменили или поправили запись в
 * `change:value:before` — источник получает обратно то, что принято. Дат
 * DatePicker не считает: старт фокуса, выбор, предпросмотр и форма значения по
 * режиму — расширения календаря.
 *
 * **Открытость — как у Select:** `open`, `toggleOpen()`, `openable` (не
 * `disabled` и не `readonly`), события `open` и `close`, `data-open`. Открывают
 * панель кнопка календаря и Alt+↓ на поле — плагин; ввод в поле её не
 * открывает. Выбор закрывает её при `closeOnSelect` — в диапазоне второй день.
 *
 * Паттерн доступности — APG Date Picker Dialog: поле и отдельная кнопка, у
 * панели `role="dialog"` и `aria-modal`. У одной даты группа частей — само
 * поле, у диапазона — корень (`rootAria`) с полями концов внутри. Модификатор
 * режима (`--single`, `--range`) — для темы: коробку диапазона она строит на
 * корне.
 *
 * **Жест** (`swipe`, по умолчанию выключен) — смахнуть панель, чтобы закрыть:
 * DatePicker — смахиваемый слой (`ISwipeable`), как Select. Панель уходит от
 * поля — вниз, если стоит под ним, и вверх, если над ним; сторону решает flip
 * плагина якоря, поэтому `swipeSide` — всегда `null`. Признак «тянут»
 * (`swiping`) панель получает набором `panelDataset`, рядом с `panelAria`.
 * Закрывает жест записью `open`, как Escape, и фокус возвращается туда, откуда
 * открыли.
 */
export class TDatePicker
	extends TInputControl<TDatePickerValue, IDatePickerProps, TDatePickerEvents>
	implements IDatePicker
{
	static override baseClass = 's-date-picker'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<
			IDatePickerProps,
			'mode' | 'open' | 'closeOnSelect' | 'locale' | 'startName' | 'endName' | 'swipe',
			'min' | 'max' | 'unavailable' | 'weekStart' | 'timeZone'
		> = {
		...TInputControl.defaultValues,
		mode: 'single',
		open: false,
		closeOnSelect: true,
		min: undefined,
		max: undefined,
		unavailable: undefined,
		// Не задан — первый день недели даёт `locale`
		weekStart: undefined,
		locale: DEFAULT_LOCALE,
		timeZone: undefined,
		// Без имени, как `name`: поле без имени в форму не уходит
		startName: '',
		endName: '',
		swipe: 'none',
	}

	protected _mode: TDatePickerMode
	protected _open!: boolean
	protected _closeOnSelect: boolean
	protected _min: TCalendarDate | undefined
	protected _max: TCalendarDate | undefined
	protected _unavailable: TCalendarUnavailable | undefined
	protected _weekStart: TWeekday | undefined
	protected _locale: string
	protected _timeZone: string | undefined
	protected _startName: string
	protected _endName: string
	protected _swipe: TSwipe
	protected _swiping = false
	protected readonly _field: IDateInput
	protected readonly _start: IDateInput
	protected readonly _end: IDateInput
	protected readonly _calendar: ICalendar
	protected readonly _engine: TCalendarCollection
	protected readonly _triggerAria: TAria
	protected readonly _panelAria: TAria
	/** Поля — одной даты и концов: всем им DatePicker отдаёт общее */
	private readonly _inputs: readonly IDateInput[]
	private readonly _fieldSet: TDatePickerFieldSet
	/** Поля режима: из каких полей собирается значение */
	private _fields: IDatePickerFields
	/** Сторона, откуда пришло значение, которое сейчас пишется: в неё оно не вернётся */
	private _source: TDatePickerSide | undefined = undefined
	/** Сторона, которую сейчас пишет сам DatePicker: её `change:value` — эхо записи */
	private _writing: TDatePickerSide | undefined = undefined
	/** Запись своего значения на сторону */
	private readonly _writers: Readonly<Record<TDatePickerSide, () => void>> = {
		calendar: () => {
			this._calendar.value = this.value
		},
		fields: () => this._fields.layout(this.value),
	}

	constructor(props: Partial<IDatePickerProps> = {}) {
		const ctor = new.target as typeof TDatePicker

		super(props)

		this._mode = props.mode ?? ctor.defaultValues.mode
		this._closeOnSelect = props.closeOnSelect ?? ctor.defaultValues.closeOnSelect
		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._unavailable = props.unavailable ?? ctor.defaultValues.unavailable
		this._weekStart = props.weekStart ?? ctor.defaultValues.weekStart
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._timeZone = props.timeZone ?? ctor.defaultValues.timeZone
		this._startName = props.startName ?? ctor.defaultValues.startName
		this._endName = props.endName ?? ctor.defaultValues.endName
		this._swipe = props.swipe ?? ctor.defaultValues.swipe

		// Общее полям и календарю — с самого начала, конструктором
		const shared = {
			disabled: this.disabled,
			size: this.size,
			variant: this.variant,
			locale: this._locale,
			min: this._min,
			max: this._max,
		}
		const input = { ...shared, readonly: this.readonly, required: this.required }
		// Правило недоступности — полю одной даты и началу как есть; концу — с
		// якорем «начало», когда начало разложено (`_syncEnd`)
		const ruled = { ...input, unavailable: this._unavailable }

		this._field = new TDateInput({ ...ruled, name: this.name })
		this._start = new TDateInput({ ...ruled, name: this._startName })
		this._end = new TDateInput({ ...input, name: this._endName })
		this._inputs = [this._field, this._start, this._end]
		this._fieldSet = { field: this._field, start: this._start, end: this._end }
		this._fields = new FIELDS[this._mode](this._fieldSet)

		// Календарь — без значения: режим выбора ставится раньше, и значение не
		// переписывается в его форму, а уходит календарю как есть
		this._calendar = new TCalendar({
			...shared,
			unavailable: this._unavailable,
			weekStart: this._weekStart,
			timeZone: this._timeZone,
		})
		this._engine = createEngineCalendar({ owner: this._calendar })
		this._engine.extensions.selection.mode = this._mode
		this._classes.add(`--${this._mode}`)

		for (const side of SIDES) this._write(side)

		// Конец — от начала, которое только что разложено
		this._syncEnd()

		// Набор кнопки: `dialog`, а не `true` — `true` у ARIA значит `menu`
		this._triggerAria = new TAria()
		this._triggerAria.events.on('change', () =>
			this.events.emit('change:triggerAria', this._triggerAria.toObject()),
		)
		this._triggerAria.add('aria-haspopup', 'dialog')

		// Набор панели: диалог, модальный для клавиатуры и скринридера
		this._panelAria = new TAria()
		this._panelAria.events.on('change', () =>
			this.events.emit('change:panelAria', this._panelAria.toObject()),
		)
		this._panelAria.add('role', 'dialog')
		this._panelAria.add('aria-modal', 'true')

		this._applyOpen(props.open ?? ctor.defaultValues.open)

		this._listenOwn()
		// Раньше сторон: к `change:value` DatePicker конец уже сверен с новым началом
		this._listenStart()
		this._listenSides()
		this._syncOpenable()
	}

	/* ------------------------------------------------------------------ */
	/* Экземпляры                                                         */
	/* ------------------------------------------------------------------ */

	get field(): IDateInput {
		return this._field
	}

	get start(): IDateInput {
		return this._start
	}

	get end(): IDateInput {
		return this._end
	}

	get calendar(): ICalendar {
		return this._calendar
	}

	get engine(): TCalendarCollection {
		return this._engine
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	get mode(): TDatePickerMode {
		return this._mode
	}

	/**
	 * Поля — нового режима, значение календаря — в его форме: выбор коллекции
	 * переписывает его сам, и оно возвращается сюда его `change:value`. Значение
	 * уже в форме режима — раскладывается по полям нового режима здесь.
	 */
	set mode(value: TDatePickerMode) {
		if (this._mode === value) return

		this._classes.swapClass({ oldClass: `--${this._mode}`, newClass: `--${value}` })
		this._mode = value
		this._fields = new FIELDS[value](this._fieldSet)
		this._engine.extensions.selection.mode = value
		this._write('fields')
		this.events.emit('change:mode', value)
	}

	get open(): boolean {
		return this._open
	}

	/**
	 * Открыли — календарь с начала: фокус сетки на выбранной дате, иначе на
	 * сегодня, и её месяц показан. Закрыли посреди диапазона — якорь снят:
	 * закрытая панель прячется, а не размонтируется, и он пережил бы её
	 * невидимым.
	 */
	set open(value: boolean) {
		if (this._open === value) return
		if (value && !this.openable) return

		this._applyOpen(value)

		if (value) {
			this._engine.extensions.focus.resetFocus()
		} else {
			this._engine.extensions.selection.cancelRange()
		}

		this.events.emit('change:open', value)
		this.events.emit(value ? 'open' : 'close')
	}

	/** Можно ли сейчас открыть панель: выключенный и только для чтения — нельзя. */
	get openable(): boolean {
		return !this.disabled && !this.readonly
	}

	/**
	 * Простой тумблер. Зовёт его плагин — нажатием кнопки календаря; Alt+↓ на
	 * поле только открывает, закрывают ещё выбор, Escape и нажатие мимо.
	 */
	toggleOpen(): void {
		this.open = !this._open
	}

	get closeOnSelect(): boolean {
		return this._closeOnSelect
	}

	set closeOnSelect(value: boolean) {
		if (this._closeOnSelect === value) return

		this._closeOnSelect = value
		this.events.emit('change:closeOnSelect', value)
	}

	get min(): TCalendarDate | undefined {
		return this._min
	}

	/** Полю одной даты и началу — как есть, концу — вместе с началом (`_syncEndMin`). */
	set min(value: TCalendarDate | undefined) {
		if (this._min === value) return

		this._min = value
		this._field.min = value
		this._start.min = value
		this._syncEndMin()
		this._calendar.min = value
		this.events.emit('change:min', value)
	}

	get max(): TCalendarDate | undefined {
		return this._max
	}

	/** Всем полям; `min` конца зависит и от него — начало за `max` его не поднимает. */
	set max(value: TCalendarDate | undefined) {
		if (this._max === value) return

		this._max = value
		this._inputs.forEach((input) => (input.max = value))
		this._syncEndMin()
		this._calendar.max = value
		this.events.emit('change:max', value)
	}

	/**
	 * Функция сверяется по ссылке: заданная заново — смена. Полю одной даты,
	 * началу и календарю — как есть, концу — с якорем «начало» (`_syncEndRule`).
	 */
	get unavailable(): TCalendarUnavailable | undefined {
		return this._unavailable
	}

	set unavailable(value: TCalendarUnavailable | undefined) {
		if (this._unavailable === value) return

		this._unavailable = value
		this._field.unavailable = value
		this._start.unavailable = value
		this._syncEndRule()
		this._calendar.unavailable = value
		this.events.emit('change:unavailable', value)
	}

	get weekStart(): TWeekday | undefined {
		return this._weekStart
	}

	set weekStart(value: TWeekday | undefined) {
		if (this._weekStart === value) return

		this._weekStart = value
		this._calendar.weekStart = value
		this.events.emit('change:weekStart', value)
	}

	get locale(): string {
		return this._locale
	}

	set locale(value: string) {
		if (this._locale === value) return

		this._locale = value
		this._inputs.forEach((input) => (input.locale = value))
		this._calendar.locale = value
		this.events.emit('change:locale', value)
	}

	get timeZone(): string | undefined {
		return this._timeZone
	}

	set timeZone(value: string | undefined) {
		if (this._timeZone === value) return

		this._timeZone = value
		this._calendar.timeZone = value
		this.events.emit('change:timeZone', value)
	}

	/**
	 * Имя начала диапазона в форме — `name` поля начала: значение в форму
	 * отдаёт поле, как у одной даты.
	 */
	get startName(): string {
		return this._startName
	}

	set startName(value: string) {
		if (this._startName === value) return

		this._startName = value
		this._start.name = value
		this.events.emit('change:startName', value)
	}

	/** Имя конца диапазона в форме — `name` поля конца. */
	get endName(): string {
		return this._endName
	}

	set endName(value: string) {
		if (this._endName === value) return

		this._endName = value
		this._end.name = value
		this.events.emit('change:endName', value)
	}

	/**
	 * За что панель можно смахнуть, чтобы закрыть: ни за что (по умолчанию), за
	 * полосу или за любое место, кроме контролов календаря и прокручиваемого
	 * содержимого — с ними работают сами.
	 */
	get swipe(): TSwipe {
		return this._swipe
	}

	set swipe(value: TSwipe) {
		if (this._swipe === value) return

		this._swipe = value

		// Жест выключили посреди жеста — тянуть больше нечего
		if (value === 'none') this._setSwiping(false)

		this.events.emit('change:swipe', value)
	}

	/**
	 * Куда панель уходит жестом — от поля. Под ним она или над ним, решает flip
	 * плагина якоря, и знает это только её узел: здесь всегда `null`.
	 */
	get swipeSide(): TSwipeSide | null {
		return null
	}

	/** Идёт жест: с `beginSwipe` до `endSwipe` или до закрытия панели. */
	get swiping(): boolean {
		return this._swiping
	}

	/**
	 * Жест начался: панель тянут. Закрытую панель и панель без жеста тянуть
	 * нельзя — тогда жест не начинается.
	 */
	beginSwipe(): boolean {
		if (this._swipe === 'none' || !this._open) return false

		this._setSwiping(true)

		return true
	}

	/**
	 * Жест кончился. Закрывать или нет, решил плагин по пройденному пути и
	 * скорости, и закрывает он записью `open`, как Escape.
	 */
	endSwipe(): void {
		this._setSwiping(false)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * Сторона кнопки в связке с панелью. Своего экземпляра у кнопки нет —
	 * набор DatePicker'а (AGENTS.md, «Часть или слот»). Живой: `aria-haspopup`,
	 * `aria-expanded` и имя пишет DatePicker, `aria-controls` — плагин связок.
	 */
	get triggerAria(): TAria {
		return this._triggerAria
	}

	/**
	 * Вид кнопки для темы: открытая панель — кнопка нажата. `data-selected`, а
	 * не `data-open`: имя описывает вид, и Button уже красит его фоном нажатия,
	 * как триггер Popover.
	 */
	get triggerDataset(): TDatasetAttributes {
		return { 'data-selected': this._open ? 'true' : 'false' }
	}

	/**
	 * Сторона панели: диалог, модальный для клавиатуры и скринридера. Панель —
	 * Frame без экземпляра в ядре, поэтому набор DatePicker'а. Живой: роль,
	 * `aria-modal` и имя пишет DatePicker, `id` — плагин связок.
	 */
	get panelAria(): TAria {
		return this._panelAria
	}

	/**
	 * Состояние панели для темы: тянут ли её (`data-swiping`) — тогда переход
	 * сдвига снят, и панель идёт за пальцем без задержки.
	 *
	 * Открытости (`data-open`) в наборе нет: её пишет слой панели (`TLayer`),
	 * чья видимость и есть `open`, — второй писатель атрибута разошёлся бы с
	 * ним. Стороны тоже нет: после flip её пишет в панель плагин якоря
	 * (`data-placement`). ARIA и `data-*` в один набор не смешиваются, поэтому
	 * набор отдельный от `panelAria`.
	 */
	get panelDataset(): TDatasetAttributes {
		return { 'data-swiping': this._swiping ? 'true' : 'false' }
	}

	/**
	 * Рисовать ли полосу, за которую панель тянут. Рисуется, пока жест включён,
	 * — и при `panel` тоже: она говорит, что панель можно смахнуть.
	 */
	get handleRendered(): boolean {
		return this._swipe !== 'none'
	}

	/**
	 * Набор корня. У диапазона корень — группа полей концов: роль и `aria`
	 * DatePicker'а с именем от плагина имени. У одной даты группа частей — само
	 * поле, имя разметка отдаёт ему, а корню ARIA не нужна.
	 */
	get rootAria(): TAriaAttributes {
		return this._mode === 'range' ? { role: 'group', ...this._aria.toObject() } : {}
	}

	override getProps(): IDatePickerProps {
		return {
			...super.getProps(),
			mode: this._mode,
			open: this._open,
			closeOnSelect: this._closeOnSelect,
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			weekStart: this._weekStart,
			locale: this._locale,
			timeZone: this._timeZone,
			startName: this._startName,
			endName: this._endName,
			swipe: this._swipe,
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Своё значение сменилось — оно уходит на стороны, кроме той, откуда
	 * пришло. Раньше событий: подписчик `change:value` застаёт поля и календарь
	 * с новым значением.
	 */
	protected override _valueChanged(oldValue: TDatePickerValue): void {
		for (const side of SIDES) if (side !== this._source) this._write(side)

		super._valueChanged(oldValue)
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		// Закрытую панель не тянут: жест кончается вместе с ней
		if (!value) this._setSwiping(false)

		this._triggerAria.add('aria-expanded', value ? 'true' : 'false')
		// Тема и потребитель, красящий кнопку или корень по контексту, читают
		// открытость с корня — как у Select
		this._dataset.add('open', value)
	}

	/** Открывать нечего — открытая панель закрывается, а не остаётся висеть. */
	protected _syncOpenable(): void {
		if (!this.openable && this._open) this.open = false
	}

	protected _setSwiping(value: boolean): void {
		if (this._swiping === value) return

		this._swiping = value
		this.events.emit('change:swiping', value)
	}

	/** Свои свойства из базы — полям и календарю. */
	private _listenOwn(): void {
		this.events.on('change:disabled', (value: boolean) => {
			// Закрыть раньше, чем выключится календарь: снять начатый диапазон
			// выключенным он не даст
			this._syncOpenable()
			this._inputs.forEach((input) => (input.disabled = value))
			this._calendar.disabled = value
		})
		this.events.on('change:readonly', (value: boolean) => {
			this._syncOpenable()
			this._inputs.forEach((input) => (input.readonly = value))
		})
		this.events.on('change:required', (value: boolean) => {
			this._inputs.forEach((input) => (input.required = value))
		})
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			this._inputs.forEach((input) => (input.size = payload.newValue))
			this._calendar.size = payload.newValue
		})
		this.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				this._inputs.forEach((input) => (input.variant = payload.newValue))
				this._calendar.variant = payload.newValue
			},
		)
		this.events.on('change:name', (value: string) => (this._field.name = value))
	}

	/** Начало сменилось — конец сверяется с ним заново. */
	private _listenStart(): void {
		this._start.events.on('change:value', () => this._syncEnd())
	}

	/**
	 * Сверка конца диапазона с началом — как второго дня в календаре с якорем:
	 * раньше начала — ошибка (`min`), а недоступен ли конец, решает правило с
	 * якорем «начало».
	 */
	private _syncEnd(): void {
		this._syncEndMin()
		this._syncEndRule()
	}

	/**
	 * `min` конца — начало, когда оно позже `min` DatePicker и не за `max`.
	 * Начало за `max` конец не поднимает: граница раньше `min` у поля
	 * схлопывается в `min`, и конец, равный такому началу, прошёл бы проверку,
	 * оставаясь за `max`. Ошибку тогда показывает начало, а конец сверяется со
	 * своими границами.
	 */
	private _syncEndMin(): void {
		this._end.min = endMinOf(this._min, this._max, this._startDate)
	}

	/**
	 * Правило конца — правило DatePicker с якорем «начало»: так «не дольше N
	 * ночей» и «не через занятые дни» проверяются и у набранного конца.
	 * Пересобирается на смену правила и начала — новая функция, и поле
	 * пересчитывает ошибку.
	 */
	private _syncEndRule(): void {
		const rule = this._unavailable
		const anchor = this._startDate

		this._end.unavailable = rule === undefined ? undefined : (date) => rule(date, anchor)
	}

	/** Набранное начало диапазона; не набрано или не дата — `undefined`. */
	private get _startDate(): TCalendarDate | undefined {
		return parseDate(this._start.value)
	}

	/** Правка сторон — в своё значение; выбор пользователя в календаре — закрытие. */
	private _listenSides(): void {
		this._calendar.events.on('change:value', () => {
			if (this._writing !== 'calendar') {
				this._accept('calendar', pickerValueOf(this._calendar.value))
			}
		})

		for (const input of this._inputs) {
			input.events.on('change:value', () => {
				if (this._writing !== 'fields' && this._fields.includes(input)) {
					this._accept('fields', this._fields.compose())
				}
			})
		}

		this._engine.extensions.selection.events.on('choose', () => {
			// Без якоря — выбор закончен: одна дата или второй день диапазона
			if (this._closeOnSelect && this._engine.extensions.selection.anchor === undefined) {
				this.open = false
			}
		})
	}

	/**
	 * Значение пришло со стороны. В сторону-источник оно не возвращается, а
	 * если запись отменили или поправили, источник получает обратно принятое.
	 */
	private _accept(side: TDatePickerSide, incoming: TDatePickerValue): void {
		this._source = side

		try {
			this.value = incoming
		} finally {
			this._source = undefined
		}

		if (!sameValue(this.value, incoming)) this._write(side)
	}

	/** Своё значение — на сторону; её `change:value` в это время — эхо, а не правка. */
	private _write(side: TDatePickerSide): void {
		this._writing = side

		try {
			this._writers[side]()
		} finally {
			this._writing = undefined
		}
	}
}

/**
 * Первый верный день конца диапазона: начало, когда оно позже `min` и не за
 * `max`, иначе сам `min`. Невалидная граница не ограничивает, как у поля.
 */
function endMinOf(
	min: TCalendarDate | undefined,
	max: TCalendarDate | undefined,
	start: TCalendarDate | undefined,
): TCalendarDate | undefined {
	const low = parseDate(min)
	const high = parseDate(max)

	if (start === undefined) return min
	if (low !== undefined && compareDates(start, low) <= 0) return min
	if (high !== undefined && compareDates(start, high) > 0) return min

	return start
}

/**
 * Значение календаря — значением DatePicker. Календарь в панели выбирает дату
 * или пару, но его значение общего вида — со списком дат режима `multiple`;
 * список здесь — пара его первых двух дат.
 */
function pickerValueOf(value: TCalendarValue): TDatePickerValue {
	if (!Array.isArray(value)) return value

	const [start, end] = value

	return start !== undefined && end !== undefined ? [start, end] : undefined
}
