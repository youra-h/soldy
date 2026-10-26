import { TClearable } from '../../base/clearable'
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
import type { IDateInput, IDateInputProps } from '../date-input'
import { TConfirmCommit, TInstantCommit } from './commit'
import type { IDatePickerCommit, IDatePickerCommitHost } from './commit'
import { TRangeFields, TSingleFields } from './fields'
import type {
	IDatePickerFields,
	TDatePickerFieldRole,
	TDatePickerFieldSet,
	TDatePickerFieldsMap,
} from './fields'
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

/** Политика фиксации на `confirmable` — её заводит сеттер: по «OK» или сразу. */
function commitOf(confirmable: boolean, host: IDatePickerCommitHost): IDatePickerCommit {
	return confirmable ? new TConfirmCommit(host) : new TInstantCommit(host)
}

/**
 * A date field and a calendar in a panel, as Select is a field and a list.
 *
 * **The instances are the picker's for its whole life, each built when first
 * needed.** The fields (`field` — the single date, `start` and `end` — the
 * range ends), the calendar and its collection's engine are the picker's own,
 * and the markup hands them to components whole, as Select hands over its
 * `field` and the calendar's `picker` extension the ListBox of the month
 * panel. Subscriptions to them are direct. The calendar and the engine exist
 * from the start. A field is created when its mode needs it — the mode's
 * strategy takes it — or when its getter is read, and it stays: a mode coming
 * back gets the same instance, and a single date holds no range ends. The
 * calendar becomes the engine's owner when the picker first gives the
 * collection work — on opening and on a mode change (`_bindCalendar`): the
 * days and the month pickers are built for the owner only, so a closed picker
 * nobody opened is a field with a button in memory too. The picker holds the
 * engine because it calls its extensions' commands and listens to them:
 * opening puts the grid's focus on the start (`resetFocus`), closing drops a
 * begun range (`cancelRange`), the user's choice (`choose`) closes the panel,
 * and the anchor disables «OK» (`confirmDisabled`).
 *
 * **Shared state goes down, from the core.** `disabled`, `size`, `variant`,
 * `locale`, `min`, `max` and `unavailable` go to the fields and the calendar,
 * `readonly`, `required`, `invalid` and `validate` — to the fields, `weekStart`
 * and `timeZone` — to the calendar, `name` — to the single date's field,
 * `startName` and `endName` — to the range ends, the mode — to the collection's
 * selection. A field created later gets all of it as it is by then. The markup
 * does not pass these values on: a second path to the same data would part
 * from the first. The picker builds no library strings and hands none down:
 * the name of the calendar button (the panel's name too) in `triggerAria` and
 * `panelAria`, the name of the clear button in `clearAria` and the names of the
 * range ends come from its names plugin (`TDatePickerNamesPlugin`), and the
 * fields and the calendar, mounted by their own components, get names from
 * their own names plugins, as Select's field does.
 *
 * **A field marks as an error what the calendar would not let choose**, and
 * does not clamp what was typed: a date out of bounds or unavailable, and the
 * range end — also one earlier than the start. The end is checked against the
 * typed start, as the second day in the calendar is against the anchor: the
 * start is its `min`, and it gets the unavailability rule with the anchor
 * «start». The start, the rule or the bounds changed — the end's check is
 * rebuilt.
 *
 * **One value, two sides** — the calendar and the mode's fields
 * (`IDatePickerFields`, a strategy per mode, like the calendar's selection).
 * The own value goes to both sides, an edit of one reaches the other through
 * it. It does not return to the side it came from: a range end typed halfway
 * gives no value, but does not erase what was typed either. A write cancelled
 * or corrected in `change:value:before` — the source gets back what was
 * accepted. The picker counts no dates: the focus start, the choice, the
 * preview and the value's form per mode are the calendar's extensions.
 *
 * **Openness — as Select's:** `open`, `toggleOpen()`, `openable` (neither
 * `disabled` nor `readonly`), events `open` and `close`, `data-open`. The
 * calendar button and Alt+↓ on the field open the panel — a plugin; typing into
 * the field does not. A choice closes it with `closeOnSelect` — in a range the
 * second day, — unless choices are confirmed with a button.
 *
 * **A choice is confirmed with a button if `confirmable`.** When an edit of the
 * calendar becomes the value is decided by the commit policy (`commit/`, a
 * strategy the `confirmable` setter changes): at once — by default — or on
 * «OK». On «OK» the choice in the calendar is a draft, and the calendar itself
 * keeps it: there is no second copy of the value. `confirm()` moves it into the
 * value and closes the panel, any other closing gives the calendar the picker's
 * value back. While a range is half chosen, «OK» is disabled
 * (`confirmDisabled`).
 *
 * **The clear button — the picker as a field** (base `TClearable`, the third
 * form of a field next to Input and DateInput): `clearable`, the button's set
 * `clearAria` and the command `clear`. One button per value: a range has one
 * for the period, not a button per end, as it has one frame and one calendar
 * button. `clearable` does not go to the fields: the picker clears its whole
 * mode — both ends of a range, those typed halfway too, which have no value.
 * Hence the picker's `clear` event is one for both modes.
 *
 * The accessibility pattern is APG Date Picker Dialog: a field and a separate
 * button, the panel has `role="dialog"` and `aria-modal`. For a single date the
 * group of parts is the field itself, for a range — the root (`rootAria`) with
 * the ends' fields inside. The mode modifier (`--single`, `--range`) is for the
 * theme: it builds the range's box on the root.
 *
 * **Swipe** (`swipe`, off by default) — swipe the panel away to close it: the
 * picker is a swipeable layer (`ISwipeable`), as Select. The panel leaves away
 * from the field — down if it stands below it, up if above; the anchor
 * plugin's flip decides the side, so `swipeSide` is always `null`. The panel
 * gets the «being dragged» sign (`swiping`) in the `panelDataset` set, next to
 * `panelAria`. The swipe closes by writing `open`, as Escape, and the focus
 * returns where the panel was opened from.
 */
export class TDatePicker
	extends TClearable<TDatePickerValue, IDatePickerProps, TDatePickerEvents>
	implements IDatePicker
{
	static override baseClass = 'so-date-picker'

	static defaultValues: typeof TClearable.defaultValues &
		TDefaultValues<
			IDatePickerProps,
			| 'mode'
			| 'open'
			| 'closeOnSelect'
			| 'confirmable'
			| 'validate'
			| 'locale'
			| 'startName'
			| 'endName'
			| 'swipe',
			'min' | 'max' | 'unavailable' | 'weekStart' | 'timeZone'
		> = {
		...TClearable.defaultValues,
		mode: 'single',
		open: false,
		closeOnSelect: true,
		confirmable: false,
		min: undefined,
		max: undefined,
		unavailable: undefined,
		// Верна ли дата, по умолчанию решает приложение — как у поля
		validate: false,
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
	/** Whether the panel has ever been open — from then on the calendar stays mounted. */
	protected _opened = false
	protected _closeOnSelect: boolean
	protected _confirmable: boolean
	protected _min: TCalendarDate | undefined
	protected _max: TCalendarDate | undefined
	protected _unavailable: TCalendarUnavailable | undefined
	protected _validate: boolean
	protected _weekStart: TWeekday | undefined
	protected _locale: string
	protected _timeZone: string | undefined
	protected _startName: string
	protected _endName: string
	protected _swipe: TSwipe
	protected _swiping = false
	/** The single date's field — until its mode or its getter needs it, there is none */
	protected _field: IDateInput | undefined = undefined
	/** The range start's field — created with the range or by its getter */
	protected _start: IDateInput | undefined = undefined
	/** The range end's field — created with the range or by its getter */
	protected _end: IDateInput | undefined = undefined
	protected readonly _calendar: ICalendar
	protected readonly _engine: TCalendarCollection
	protected readonly _triggerAria: TAria
	protected readonly _panelAria: TAria
	/** The fields created so far — the single date's and the ends': the shared state goes to them */
	private readonly _inputs: IDateInput[] = []
	/**
	 * The fields by role: a field is created on its first call and kept. The
	 * mode's strategy takes its own; the start re-checks the end before the
	 * sides hear its edit (`_listenStart`).
	 */
	private readonly _fieldSet: TDatePickerFieldSet = {
		field: () => (this._field ??= this._adopt(this._createField('field'))),
		start: () => (this._start ??= this._adopt(this._listenStart(this._createField('start')))),
		end: () => (this._end ??= this._adopt(this._createField('end'))),
	}
	/**
	 * What a field of each role gets on top of the shared state: its name in a
	 * form, and the end — `min` and the rule from the start, as `_syncEnd` keeps
	 * them.
	 */
	private readonly _roleProps: Readonly<
		Record<TDatePickerFieldRole, () => Partial<IDateInputProps>>
	> = {
		field: () => ({ name: this.name, unavailable: this._unavailable }),
		start: () => ({ name: this._startName, unavailable: this._unavailable }),
		end: () => ({ name: this._endName, min: this._endMin(), unavailable: this._endRule() }),
	}
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
	/** Команды DatePicker для политики фиксации: когда их звать, решает она */
	private readonly _commitHost: IDatePickerCommitHost = {
		accept: () => this._acceptCalendar(),
		reset: () => this._write('calendar'),
		closeAfterChoice: () => {
			// Без якоря — выбор закончен: одна дата или второй день диапазона
			if (this._closeOnSelect && this._engine.extensions.selection.anchor === undefined) {
				this.open = false
			}
		},
	}
	/** Политика фиксации: когда правка календаря становится значением */
	private _commit: IDatePickerCommit

	constructor(props: Partial<IDatePickerProps> = {}) {
		const ctor = new.target as typeof TDatePicker

		super(props)

		this._mode = props.mode ?? ctor.defaultValues.mode
		this._closeOnSelect = props.closeOnSelect ?? ctor.defaultValues.closeOnSelect
		this._confirmable = props.confirmable ?? ctor.defaultValues.confirmable
		this._commit = commitOf(this._confirmable, this._commitHost)
		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._unavailable = props.unavailable ?? ctor.defaultValues.unavailable
		this._validate = props.validate ?? ctor.defaultValues.validate
		this._weekStart = props.weekStart ?? ctor.defaultValues.weekStart
		this._locale = props.locale ?? ctor.defaultValues.locale
		this._timeZone = props.timeZone ?? ctor.defaultValues.timeZone
		this._startName = props.startName ?? ctor.defaultValues.startName
		this._endName = props.endName ?? ctor.defaultValues.endName
		this._swipe = props.swipe ?? ctor.defaultValues.swipe

		// The fields of the mode — its strategy creates them from the shared state
		// (`_createField`); the other mode's fields wait for it
		this._fields = new FIELDS[this._mode](this._fieldSet)

		// The calendar has no value yet: the selection mode is set earlier, and
		// the value is not rewritten into its form but goes to the calendar as is
		this._calendar = new TCalendar({
			disabled: this.disabled,
			size: this.size,
			variant: this.variant,
			locale: this._locale,
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			weekStart: this._weekStart,
			timeZone: this._timeZone,
		})
		// Without an owner: the calendar goes into the engine when the picker
		// first gives the collection work (`_bindCalendar`)
		this._engine = createEngineCalendar()
		this._engine.extensions.selection.mode = this._mode
		this._classes.add(`--${this._mode}`)

		// The end is checked against the start as the fields are laid out: the
		// start re-checks it on its own edit (`_listenStart`)
		for (const side of SIDES) this._write(side)

		// Набор кнопки: `dialog`, а не `true` — `true` у ARIA значит `menu`
		this._triggerAria = new TAria()
		this._triggerAria.subscribe(() =>
			this.events.emit('change:triggerAria', this._triggerAria.toObject()),
		)
		this._triggerAria.add('aria-haspopup', 'dialog')

		// Набор панели: диалог, модальный для клавиатуры и скринридера
		this._panelAria = new TAria()
		this._panelAria.subscribe(() =>
			this.events.emit('change:panelAria', this._panelAria.toObject()),
		)
		this._panelAria.add('role', 'dialog')
		this._panelAria.add('aria-modal', 'true')

		this._applyOpen(props.open ?? ctor.defaultValues.open)

		this._listenOwn()
		this._listenCalendar()
		this._listenChoice()
		this._syncOpenable()
	}

	/* ------------------------------------------------------------------ */
	/* Экземпляры                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * The single date's field. Reading creates it, if the single mode has not
	 * yet: the field is the picker's either way, and a DateInput given no
	 * `ctrl` would build its own.
	 */
	get field(): IDateInput {
		return this._fieldSet.field()
	}

	/** The range start's field — created by the range or on first read, as `field`. */
	get start(): IDateInput {
		return this._fieldSet.start()
	}

	/** The range end's field — created by the range or on first read, as `field`. */
	get end(): IDateInput {
		return this._fieldSet.end()
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
	 * The fields of the new mode — its strategy creates them on the first
	 * switch, — and the value in its form. The form is written by the
	 * collection's selection: it rewrites the calendar's value, and the picker
	 * takes it from there under any commit policy — on «OK» an edit of the
	 * calendar does not become the value by itself. So the calendar goes into
	 * the engine first (`_bindCalendar`): without an owner the selection has
	 * nowhere to write. The draft is reset earlier still: the new mode's form
	 * is given to the picker's value, not to a begun choice. A value already in
	 * the mode's form is laid out over the new mode's fields here.
	 */
	set mode(value: TDatePickerMode) {
		if (this._mode === value) return

		this._classes.swapClass({ oldClass: `--${this._mode}`, newClass: `--${value}` })
		this._mode = value
		this._fields = new FIELDS[value](this._fieldSet)
		this._write('calendar')
		this._bindCalendar()
		this._engine.extensions.selection.mode = value
		this._acceptCalendar()
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
	 * невидимым. Закрытие — ещё и повод политики фиксации: по «OK» оно
	 * сбрасывает черновик, каким бы путём панель ни закрыли.
	 */
	set open(value: boolean) {
		if (this._open === value) return
		if (value && !this.openable) return

		this._applyOpen(value)

		if (value) {
			this._engine.extensions.focus.resetFocus()
		} else {
			this._engine.extensions.selection.cancelRange()
			this._commit.close()
		}

		this.events.emit('change:open', value)
		this.events.emit(value ? 'open' : 'close')
	}

	/**
	 * Whether the panel's calendar is mounted: from the first opening on. A
	 * closed picker nobody opened is a field with a button — a month of days
	 * built for every date field of a form would outweigh the form itself. The
	 * same opening gives the engine its calendar (`_bindCalendar`), so such a
	 * picker holds no days in the core either. Closing does not unmount the
	 * calendar: openness is the panel's `visible`, not `rendered`.
	 */
	get contentRendered(): boolean {
		return this._opened
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

	/** Закрывать ли панель после выбора. При `confirmable` не действует. */
	get closeOnSelect(): boolean {
		return this._closeOnSelect
	}

	set closeOnSelect(value: boolean) {
		if (this._closeOnSelect === value) return

		this._closeOnSelect = value
		this.events.emit('change:closeOnSelect', value)
	}

	get confirmable(): boolean {
		return this._confirmable
	}

	/**
	 * Политика фиксации — стратегия: сразу или по «OK». Черновик при смене
	 * сбрасывается — календарь снова показывает значение DatePicker. У закрытой
	 * панели черновика нет, и запись — эхо.
	 */
	set confirmable(value: boolean) {
		if (this._confirmable === value) return

		this._confirmable = value
		this._commit = commitOf(value, this._commitHost)
		this._write('calendar')
		this.events.emit('change:confirmable', value)
	}

	/**
	 * Выключена ли «OK»: пока диапазон выбран наполовину — стоит якорь.
	 * Нажатие молча оставило бы прежний диапазон, а начатый выбор потерялся бы.
	 */
	get confirmDisabled(): boolean {
		return this._engine.extensions.selection.anchor !== undefined
	}

	/**
	 * «OK» панели: значение календаря — в значение DatePicker, панель закрыта.
	 * Отменили или поправили запись в `change:value:before` — календарь
	 * получает обратно принятое, как любая сторона. Пока «OK» выключена
	 * (`confirmDisabled`), не делает ничего, как выключенная кнопка.
	 */
	confirm(): void {
		if (this.confirmDisabled) return

		this._acceptCalendar()
		this.open = false
	}

	get min(): TCalendarDate | undefined {
		return this._min
	}

	/** Полю одной даты и началу — как есть, концу — вместе с началом (`_syncEndMin`). */
	set min(value: TCalendarDate | undefined) {
		if (this._min === value) return

		this._min = value
		this._unanchored.forEach((input) => (input.min = value))
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
		this._unanchored.forEach((input) => (input.unavailable = value))
		this._syncEndRule()
		this._calendar.unavailable = value
		this.events.emit('change:unavailable', value)
	}

	/**
	 * Проверка набора — всем полям: одной даты и обоим концам диапазона.
	 * Календарю она не нужна: набора у него нет. Набранного не меняет — поле
	 * применяет её со следующей цифры.
	 */
	get validate(): boolean {
		return this._validate
	}

	set validate(value: boolean) {
		if (this._validate === value) return

		this._validate = value
		this._inputs.forEach((input) => (input.validate = value))
		this.events.emit('change:validate', value)
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
		if (this._start) this._start.name = value
		this.events.emit('change:startName', value)
	}

	/** Имя конца диапазона в форме — `name` поля конца. */
	get endName(): string {
		return this._endName
	}

	set endName(value: string) {
		if (this._endName === value) return

		this._endName = value
		if (this._end) this._end.name = value
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
	 * DatePicker'а — имя, описание, ошибка. У одной даты группа частей — само
	 * поле, и `aria` DatePicker'а разметка кладёт на него, а корню ARIA не нужна.
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
			confirmable: this._confirmable,
			min: this._min,
			max: this._max,
			unavailable: this._unavailable,
			validate: this._validate,
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

	/**
	 * Шаг очистки (`clear`): поля режима пустеют командой поля — у диапазона
	 * оба конца. Записью своего значения этого не сделать: у конца, набранного
	 * не до конца, значения нет, и `undefined` его частей не тронул бы. Это
	 * правка полей, как Delete по частям: значение DatePicker снимает сторона
	 * полей, и запись можно отменить в `change:value:before` — тогда поля
	 * получат принятое обратно.
	 */
	protected override _clearValue(): void {
		this._fields.clear()
	}

	protected _applyOpen(value: boolean): void {
		this._open = value

		if (value) {
			this._opened = true
			// On every opening: the focus start needs the calendar in the engine,
			// and an unmounted Calendar may have released it since the last one
			this._bindCalendar()
		}

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

	/**
	 * The calendar into the engine — when the picker gives its collection work:
	 * opening (the grid's focus starts on the chosen date) and a mode change (the
	 * selection writes the value in the new mode's form). The days and the month
	 * pickers are built for the owner only (`view` and `picker` watch it), so a
	 * closed picker nobody opened holds none. The same owner wakes no watcher, a
	 * mounted Calendar binds the same one, and closing does not release it.
	 * Until then the rest lives without it: the value is the calendar's, the
	 * mode and the anchor are the selection's, and `cancelRange` and
	 * `confirmDisabled` have no anchor to see.
	 */
	private _bindCalendar(): void {
		this._engine.options.set({ owner: this._calendar })
	}

	/**
	 * A field of the role from the picker's current state — one place for every
	 * role: the shared state, the role's own (`_roleProps`) and the form field's
	 * error. A field created after the picker gets the same as one created with
	 * it.
	 */
	private _createField(role: TDatePickerFieldRole): IDateInput {
		const input = new TDateInput({
			disabled: this.disabled,
			size: this.size,
			variant: this.variant,
			locale: this._locale,
			min: this._min,
			max: this._max,
			readonly: this.readonly,
			required: this.required,
			validate: this._validate,
			...this._roleProps[role](),
		})

		// An instance property, not a prop: written as `change:invalid` writes it
		input.invalid = this.invalid

		return input
	}

	/**
	 * A created field joins the picker: the shared state goes to it from now on,
	 * and an edit in it becomes the value while it is a field of the mode.
	 */
	private _adopt(input: IDateInput): IDateInput {
		this._inputs.push(input)

		input.events.on('change:value', () => {
			if (this._writing !== 'fields' && this._fields.includes(input)) {
				this._accept('fields', this._fields.compose())
			}
		})

		return input
	}

	/**
	 * The created fields that take `min` and the rule as they are — the single
	 * date's and the range start. The end takes them with the start (`_syncEnd`).
	 */
	private get _unanchored(): IDateInput[] {
		return [this._field, this._start].filter((input) => input !== undefined)
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
		// Ошибка поля формы — полям, как `required`: `aria-invalid` стоит на их
		// частях. Свою проверку — границы и конец раньше начала — поля держат
		// сами, и ошибка DatePicker её не стирает
		this.events.on('change:invalid', (value: boolean) => {
			this._inputs.forEach((input) => (input.invalid = value))
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
		this.events.on('change:name', (value: string) => {
			if (this._field) this._field.name = value
		})
	}

	/**
	 * The start changed — the end is checked against it anew. Subscribed before
	 * the sides (`_adopt`): by the picker's `change:value` the end is already
	 * checked against the new start.
	 */
	private _listenStart(start: IDateInput): IDateInput {
		start.events.on('change:value', () => this._syncEnd())

		return start
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

	/** `min` of the end from the start (`_endMin`) — if there is an end. */
	private _syncEndMin(): void {
		if (this._end) this._end.min = this._endMin()
	}

	/** The end's rule against the start (`_endRule`) — if there is an end. */
	private _syncEndRule(): void {
		if (this._end) this._end.unavailable = this._endRule()
	}

	/**
	 * `min` of the end — the start, when it is later than the picker's `min` and
	 * not past `max`. A start past `max` does not raise the end: a bound earlier
	 * than `min` collapses into `min` at the field, and an end equal to such a
	 * start would pass the check while staying past `max`. The start shows the
	 * error then, and the end is checked against its own bounds.
	 */
	private _endMin(): TCalendarDate | undefined {
		return endMinOf(this._min, this._max, this._startDate)
	}

	/**
	 * The end's rule — the picker's rule with the anchor «start»: so «no longer
	 * than N nights» and «not through booked days» are checked at a typed end
	 * too. A new function on every call: the end gets one on a change of the
	 * rule and of the start, and the field recounts its error.
	 */
	private _endRule(): TCalendarUnavailable | undefined {
		const rule = this._unavailable
		const anchor = this._startDate

		return rule === undefined ? undefined : (date) => rule(date, anchor)
	}

	/** The typed range start; not typed, not a date or no start field — `undefined`. */
	private get _startDate(): TCalendarDate | undefined {
		return parseDate(this._start?.value)
	}

	/**
	 * An edit of the calendar goes to the commit policy: at once or as a draft
	 * until «OK». An edit of a field becomes the value at once (`_adopt`).
	 */
	private _listenCalendar(): void {
		this._calendar.events.on('change:value', () => {
			if (this._writing !== 'calendar') this._commit.edit()
		})
	}

	/**
	 * Выбор пользователя в календаре — политике фиксации: сразу он закрывает
	 * панель, по «OK» — нет. Якорь — выключенность «OK».
	 */
	private _listenChoice(): void {
		const { selection } = this._engine.extensions

		selection.events.on('choose', () => this._commit.choose())

		// Якорь ставит первый день диапазона и снимает второй, а смена режима и
		// отмена — только снимают: каждая его смена выключает «OK» или включает
		selection.events.on('change:anchor', (anchor) =>
			this.events.emit('change:confirmDisabled', anchor !== undefined),
		)
	}

	/** Значение календаря — в своё: календарь — сторона, как поля. */
	private _acceptCalendar(): void {
		this._accept('calendar', pickerValueOf(this._calendar.value))
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
