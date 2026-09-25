import { TInputControl } from '../../base/input-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { TAriaAttributes, TScrollBehavior, TValuePayload, TEventSink } from '../../../common'
import type { TComponentSize, TComponentVariant } from '../../../common'
import { LIST_DEFAULTS, LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../list'
import type { IListProps, TListContentFit, TListIndicator } from '../list'
import { TInput } from '../input'
import type { IInput } from '../input'
import type {
	ISelect,
	ISelectProps,
	TSelectEditableMode,
	TSelectEvents,
	TSelectPanelPlacement,
	TSelectPlacement,
	TSelectStates,
	TSelectValue,
} from './types'

/**
 * Поле выбора из списка (`Select`).
 *
 * Наследует `TInputControl`: у него есть `value`/`name` для формы и
 * `readonly`/`required`. Своё здесь — состояние панели и то, как поле себя
 * подаёт.
 *
 * О коллекции класс не знает. Опции, выбор и связка с списком живут в
 * `TSelectCollectionFacade` и `TSelectExtension` — так же, как у Tabs.
 *
 * Паттерн доступности — APG Combobox, вариант select-only: поле объявляет
 * себя `combobox`, а DOM-фокус с него не уходит никогда. `role`,
 * `aria-haspopup`, `aria-expanded` и `aria-autocomplete` пишутся в
 * `field.aria`, а не в собственный `aria` Select: паттерн описывает элемент,
 * на котором держится фокус, — нативный `<input>`, а не корневой `div`.
 * `aria-controls` (список) и `aria-activedescendant` (подсветка) пишут туда
 * же расширение коллекции и клавиатурный плагин — имена и `id` списка/опции
 * знают они, не поле.
 *
 * `maxRows`, `contentFit`, `scrollBehavior`, `indicator` — общий с ListBox
 * контракт `IList`
 * (см. `custom/list/types.ts`), реализованный здесь своей копией: общего предка
 * у списка и поля выбора быть не может. Копии сверяет
 * `core/__tests__/list-contract.spec.ts`.
 *
 * `value`/`name`/`readonly`/`required` от `TInputControl` — служебное
 * состояние самого Select, не то, что пользователь видит внутри поля и что
 * объявляет скринридеру. Этим владеет отдельный инстанс `TInput` (`field`):
 * Select создаёт его один раз и синхронизирует с ним общие свойства
 * (`disabled`, `size`, `variant`, `readonly`, `required`, `name`, `id`).
 * Второго значения поля рядом с этим не заводим — единственный держатель
 * текста, плейсхолдера и ARIA поля это и есть `field`.
 */
export class TSelect<
	TProps extends ISelectProps = ISelectProps,
	TEvents extends TSelectEvents = TSelectEvents,
	TStates extends TSelectStates = TSelectStates,
>
	extends TInputControl<TSelectValue, TProps, TEvents, TStates>
	implements ISelect<TProps, TEvents, TStates>
{
	static override baseClass = 's-select'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<
			ISelectProps,
			| keyof IListProps
			| 'open'
			| 'placeholder'
			| 'closeOnSelect'
			| 'clearable'
			| 'clearLabel'
			| 'editable'
			| 'editableMode'
			| 'removeOnBackspace'
			| 'placement'
		> = {
		...TInputControl.defaultValues,
		...LIST_DEFAULTS,
		open: false,
		placeholder: '',
		closeOnSelect: true,
		clearable: false,
		clearLabel: 'Clear',
		editable: false,
		editableMode: 'search',
		removeOnBackspace: false,
		placement: 'auto',
		// Не `false` от `TInputControl`: select-only (`editable: false`) и есть
		// `readonly`, с ним Select и стартует. Умолчание уходит адаптеру через
		// декларацию пропа, и Vue отдал бы отсутствующему `readonly` не то.
		readonly: true,
		tag: 'div',
	}

	protected _open!: boolean
	protected _placeholder!: string
	protected _closeOnSelect!: boolean
	protected _clearable!: boolean
	protected _clearLabel!: string
	protected _maxRows!: number
	protected _contentFit!: TListContentFit
	protected _scrollBehavior!: TScrollBehavior
	protected _indicator!: TListIndicator
	protected _editable!: boolean
	protected _editableMode!: TSelectEditableMode
	protected _removeOnBackspace!: boolean
	protected _placement!: TSelectPlacement
	protected readonly _field: IInput

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TSelect
		const own = props as Partial<ISelectProps>

		// Поле — экземпляр `TInput`, которым владеет Select, а не второе
		// значение рядом со своим `value`. Шаблон передаёт его целиком через
		// `ctrl` (`<Input :ctrl="field">`), как `tags` передаётся в `<Tags>`.
		// Пишут в него: `TInputPlugin` — набранное, `TSelectExtension` —
		// текст выбранного, `TEditablePlugin` — возврат текста. Двух копий
		// значения поля с этим больше нет.
		//
		// Создаётся сразу после `super()`, а не в конце конструктора: ниже
		// `_applyEditable`/`_applyOpen` уже пишут ARIA комбобокса в
		// `field.aria`, и на момент этих вызовов поле обязано существовать.
		// Начальный `readonly` не берём из `this.readonly` — `_applyEditable`
		// его ещё не пересчитал, а `_applyReadonly` события не шлёт, поэтому
		// эквивалент выключателя editable читаем явно из пропов.
		this._field = new TInput({
			disabled: this.resolvedDisabled,
			size: this.size,
			variant: this.variant,
			readonly: !(own.editable ?? ctor.defaultValues.editable),
			required: this.required,
			name: this.name,
			id: this.id,
		})

		this._placeholder = own.placeholder ?? ctor.defaultValues.placeholder
		this._closeOnSelect = own.closeOnSelect ?? ctor.defaultValues.closeOnSelect
		this._clearLabel = own.clearLabel ?? ctor.defaultValues.clearLabel

		this._maxRows = own.maxRows ?? ctor.defaultValues.maxRows
		this._scrollBehavior = own.scrollBehavior ?? ctor.defaultValues.scrollBehavior

		this._applyContentFit(own.contentFit ?? ctor.defaultValues.contentFit)
		this._applyIndicator(own.indicator ?? ctor.defaultValues.indicator)

		this._applyClearable(own.clearable ?? ctor.defaultValues.clearable)
		// `_editableMode` — до `_applyEditable`: тот вызывает
		// `_syncAutocomplete()`, и на момент вызова режим должен быть уже
		// установлен (сам `aria-autocomplete` от режима не зависит).
		this._editableMode = own.editableMode ?? ctor.defaultValues.editableMode
		this._applyEditable(own.editable ?? ctor.defaultValues.editable)
		this._removeOnBackspace = own.removeOnBackspace ?? ctor.defaultValues.removeOnBackspace
		this._placement = own.placement ?? ctor.defaultValues.placement
		// Тем же правилом, что и сеттер `editable`, только без события — и
		// после `TInputControl`, поэтому проп `readonly` здесь перекрывается.
		this._applyReadonly(!this._editable)
		this._applyOpen(own.open ?? ctor.defaultValues.open)

		// Роль и haspopup постоянны, а `aria-expanded` следует за панелью — оба
		// в `field.aria`: паттерн combobox описывает нативный `<input>`, а не
		// корневой `div` Select. `aria-controls` и `aria-activedescendant` —
		// не отсюда: они ссылаются на список и опцию, а это знание коллекции
		// и клавиатурного плагина.
		this._field.aria.add('role', 'combobox')
		this._field.aria.add('aria-haspopup', 'listbox')

		this.events.on('change:disabled:resolved', () => this._syncOpenable())

		this._syncOpenable()

		// Своё `disabled` поля — итог Select: поле — деталь Select, и
		// выключен Select — выключено и поле
		this.events.on('change:disabled:resolved', (value: boolean) => {
			this._field.disabled = value
		})
		this.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
			this._field.size = payload.newValue
		})
		this.events.on(
			'change:variant',
			(payload: TValuePayload<TComponentVariant | undefined>) => {
				this._field.variant = payload.newValue
			},
		)
		this.events.on('change:readonly', (value: boolean) => (this._field.readonly = value))
		this.events.on('change:required', (value: boolean) => (this._field.required = value))
		this.events.on('change:name', (value: string) => (this._field.name = value))
		this.events.on('change:id', (value: string) => (this._field.id = value))
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TSelectEvents> {
		return this.events
	}

	/**
	 * Поле ввода — экземпляр `TInput`, единственный владелец текста и
	 * плейсхолдера, которые видит пользователь. Не меняется за время жизни
	 * Select, поэтому `change:`-события у геттера нет: инстанс один и тот же,
	 * меняется только его собственное состояние.
	 */
	get field(): IInput {
		return this._field
	}

	/**
	 * Можно ли сейчас открыть панель.
	 *
	 * Раньше её запрещал ещё и `readonly`. Теперь `readonly` значит только
	 * «в поле нельзя печатать», и ставит его `editable`; select-only — это
	 * как раз `editable: false`, а ему панель и нужна. Остаётся выключенность:
	 * итог `resolvedDisabled`.
	 */
	get openable(): boolean {
		return !this.resolvedDisabled
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return
		if (value && !this.openable) return

		this._applyOpen(value)
		this._sink.emit('change:open', value)
		this._sink.emit(value ? 'open' : 'close')
	}

	/**
	 * Простой тумблер. Кто и когда его зовёт — решает не ядро: в select-only
	 * это клик по всему полю, в `editable` — только клик по стрелке
	 * (`TSelectPointerPlugin`), а клик по тексту поля там вообще не доходит
	 * до `toggleOpen`, потому что ставит курсор, а не открывает панель.
	 * Закрытие сверх тумблера остаётся за `Escape` и нажатием мимо
	 * (`TDismissPlugin`).
	 */
	toggleOpen(): void {
		this.open = !this._open
	}

	get placeholder(): string {
		return this._placeholder
	}

	set placeholder(value: string) {
		if (this._placeholder === value) return

		this._placeholder = value
		this._sink.emit('change:placeholder', value)
	}

	get closeOnSelect(): boolean {
		return this._closeOnSelect
	}

	set closeOnSelect(value: boolean) {
		if (this._closeOnSelect === value) return

		this._closeOnSelect = value
		this._sink.emit('change:closeOnSelect', value)
	}

	get clearable(): boolean {
		return this._clearable
	}

	set clearable(value: boolean) {
		if (this._clearable === value) return

		this._applyClearable(value)
		this._sink.emit('change:clearable', value)
	}

	get clearLabel(): string {
		return this._clearLabel
	}

	set clearLabel(value: string) {
		if (this._clearLabel === value) return

		this._clearLabel = value
		this._sink.emit('change:clearLabel', value)
	}

	/**
	 * Можно ли вводить текст в поле. `false` — режим select-only (по
	 * умолчанию): вложенный `Input` остаётся `readonly`, значение меняет
	 * только выбор из списка.
	 *
	 * Включает и выключает `readonly` — он и есть «в поле нельзя печатать».
	 * Сам `readonly` при этом обычный, своей логики у него нет.
	 */
	get editable(): boolean {
		return this._editable
	}

	set editable(value: boolean) {
		if (this._editable === value) return

		this._applyEditable(value)
		this._sink.emit('change:editable', value)

		this.readonly = !value
	}

	/**
	 * Что делает ввод текста при `editable: true`. Реакцию на сам ввод несёт
	 * `TEditablePlugin` — здесь только состояние с тремя значениями. На
	 * `aria-autocomplete` режим не влияет: при `editable` он всегда `"list"`.
	 *
	 * `search` — совпадение подсвечивается, список остаётся целым; `filter` —
	 * несовпавшие опции скрываются (`filter.query` коллекции); `none` — ввод
	 * не делает ничего сам, но приложение может слушать значение поля и
	 * подменять список (например, серверный поиск).
	 */
	get editableMode(): TSelectEditableMode {
		return this._editableMode
	}

	set editableMode(value: TSelectEditableMode) {
		if (this._editableMode === value) return

		this._applyEditableMode(value)
		this._sink.emit('change:editableMode', value)
	}

	/**
	 * Удалять ли выбранные теги по `Backspace` в пустом поле. По умолчанию
	 * `false` — реакцию на клавишу несёт отдельный плагин
	 * (`TSelectBackspacePlugin`), который слушает и это свойство, и `editable`,
	 * и режим выбора коллекции; здесь только хранится значение.
	 */
	get removeOnBackspace(): boolean {
		return this._removeOnBackspace
	}

	set removeOnBackspace(value: boolean) {
		if (this._removeOnBackspace === value) return

		this._removeOnBackspace = value
		this._sink.emit('change:removeOnBackspace', value)
	}

	/**
	 * С какой стороны поля открывается панель. `auto` (по умолчанию) — снизу,
	 * а у нижнего края окна, где снизу не помещается, сверху. `top` и `bottom`
	 * держат сторону, даже если панель там не помещается.
	 *
	 * Сторону считает не ядро, а `TAnchorPlugin` вложенного Frame: здесь только
	 * выбор потребителя, перевод в пропы якоря — `panelPlacement` и `panelFlip`.
	 */
	get placement(): TSelectPlacement {
		return this._placement
	}

	set placement(value: TSelectPlacement) {
		if (this._placement === value) return

		this._placement = value
		this._sink.emit('change:placement', value)
	}

	/** Сколько строк показывать до появления прокрутки. `0` — все. */
	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows === value) return

		this._maxRows = value
		this._sink.emit('change:maxRows', value)
	}

	/** Что делать с не помещающимся текстом. */
	get contentFit(): TListContentFit {
		return this._contentFit
	}

	set contentFit(value: TListContentFit) {
		if (this._contentFit === value) return

		this._applyContentFit(value)
		this._sink.emit('change:contentFit', value)
	}

	/** Как прокручивать к опции при навигации. */
	get scrollBehavior(): TScrollBehavior {
		return this._scrollBehavior
	}

	set scrollBehavior(value: TScrollBehavior) {
		if (this._scrollBehavior === value) return

		this._scrollBehavior = value
		this._sink.emit('change:scrollBehavior', value)
	}

	/** Где показывать отметку выбранной опции. */
	get indicator(): TListIndicator {
		return this._indicator
	}

	set indicator(value: TListIndicator) {
		if (this._indicator === value) return

		this._applyIndicator(value)
		this._sink.emit('change:indicator', value)
	}

	/**
	 * Подгонять ли ширину панели под ширину поля.
	 *
	 * Производное от `contentFit`, и вычисляется здесь по той же причине, что и
	 * `clearAria`: панель телепортирована, ширину ей задаёт плагин якоря, и
	 * шаблону остаётся только пробросить это в `anchor_matchWidth`. Оставь
	 * выражение `contentFit !== 'expand'` в разметке — и оно повторится в
	 * каждом из шести адаптеров.
	 *
	 * Списку такого свойства не нужно: у него ширину меняет сам `data-*`.
	 */
	get autoFitWidth(): boolean {
		return this._contentFit !== 'expand'
	}

	/**
	 * Сторона панели для плагина якоря (`anchor_placement`) — перевод
	 * `placement`: `top` — `top-start`, `auto` и `bottom` — `bottom-start`.
	 *
	 * Здесь, а не в разметке, по той же причине, что `autoFitWidth`: сторону
	 * телепортированной панели считает плагин якоря, шаблону остаётся только
	 * пробросить значение. Тернарный оператор в шаблоне повторился бы в каждом
	 * из шести адаптеров.
	 */
	get panelPlacement(): TSelectPanelPlacement {
		return this._placement === 'top' ? 'top-start' : 'bottom-start'
	}

	/**
	 * Разрешён ли плагину якоря flip (`anchor_flip`). Только в `auto`: `top` и
	 * `bottom` — сторона, на которой настоял потребитель, переворачивать её
	 * нельзя. Вычисляется здесь по той же причине, что `panelPlacement`.
	 */
	get panelFlip(): boolean {
		return this._placement === 'auto'
	}

	/**
	 * Имя кнопки очистки — вместе с именем поля: «Clear Город».
	 *
	 * Без него на форме с пятью полями в списке элементов скринридера будет
	 * пять одинаковых «Clear, кнопка», и выбрать нужную нельзя. Та же причина,
	 * по которой у таба имя кнопки закрытия собирается с его текстом.
	 *
	 * Отдельный набор, а не часть `aria`: `aria` описывает само поле, а это —
	 * соседняя кнопка. Один элемент — один набор.
	 */
	get clearAria(): TAriaAttributes {
		const name = this._name.trim()

		return { 'aria-label': name ? `${this._clearLabel} ${name}` : this._clearLabel }
	}

	protected _applyOpen(value: boolean): void {
		this._open = value
		this._classes.toggle('--open', value)
		// `aria-expanded` — в `field.aria`: паттерн combobox описывает нативный
		// `<input>`, а не корневой `div`.
		this._field.aria.add('aria-expanded', value ? 'true' : 'false')
		// То же состояние для темы: она разворачивает стрелку по `data-open`
		// на корне Select. ARIA поля и `data-*` корня живут на разных
		// элементах — тема ждёт `data-open` там, где ищет стрелку.
		this._dataset.add('open', value)
	}

	protected _applyClearable(value: boolean): void {
		this._clearable = value
		this._classes.toggle('--clearable', value)
	}

	protected _applyEditable(value: boolean): void {
		this._editable = value
		this._classes.toggle('--editable', value)
		this._syncAutocomplete()
	}

	protected _applyEditableMode(value: TSelectEditableMode): void {
		this._editableMode = value
		this._syncAutocomplete()
	}

	/**
	 * `aria-autocomplete`. Не `editable` — атрибута нет вовсе: поле не
	 * принимает текст, обещать автодополнение нечему. `editable` — всегда
	 * `"list"`, независимо от режима: даже при `none` список зависит от
	 * набранного текста (это делает само приложение, встроенный поиск
	 * выключен), и панель на вводе открывается, совпадение объявляется через
	 * `aria-activedescendant`.
	 */
	protected _syncAutocomplete(): void {
		if (!this._editable) {
			this._field.aria.add('aria-autocomplete', null)

			return
		}

		this._field.aria.add('aria-autocomplete', 'list')
	}

	/**
	 * `data-content-fit` на поле — и то же имя на каждой опции.
	 *
	 * Со списка тема читает `expand`, с опции — `wrap`. Одно свойство, два
	 * уровня; разрешение «опция поверх поля» делает расширение коллекции.
	 */
	protected _applyContentFit(value: TListContentFit): void {
		this._contentFit = value
		this._dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, value)
	}

	/**
	 * `data-indicator` на поле — и то же имя на каждой опции.
	 *
	 * На поле он нужен, чтобы тема резервировала место под отметку до первого
	 * выбора; опциям тот же атрибут ставит `TSelectExtension`.
	 */
	protected _applyIndicator(value: TListIndicator): void {
		this._indicator = value
		this._dataset.add(LIST_INDICATOR_ATTRIBUTE, value)
	}

	/**
	 * Пока открывать нечего — панель закрывается. Иначе `open`, выставленный
	 * до `disabled`, остался бы висеть.
	 *
	 * `tabindex` здесь больше не ставится: фокус держит нативный `<input>`
	 * поля, он и так в порядке обхода, а `disabled` на нём выводит браузер сам.
	 */
	protected _syncOpenable(): void {
		if (!this.openable && this._open) this.open = false
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			open: this._open,
			placeholder: this._placeholder,
			closeOnSelect: this._closeOnSelect,
			clearable: this._clearable,
			clearLabel: this._clearLabel,
			editable: this._editable,
			editableMode: this._editableMode,
			removeOnBackspace: this._removeOnBackspace,
			placement: this._placement,
			maxRows: this._maxRows,
			contentFit: this._contentFit,
			scrollBehavior: this._scrollBehavior,
			indicator: this._indicator,
		} as TProps
	}
}
