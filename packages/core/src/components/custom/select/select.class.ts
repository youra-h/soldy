import { TInputControl } from '../../base/input-control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type { TAriaAttributes, TScrollBehavior } from '../../../common'
import { LIST_DEFAULTS, LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../list'
import type { TListContentFit, TListIndicator } from '../list'
import type {
	ISelect,
	ISelectProps,
	TSelectEditableMode,
	TSelectEvents,
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
 * себя `combobox`, а DOM-фокус с него не уходит никогда. Подсветку опции
 * передаёт `aria-activedescendant`, который пишет расширение коллекции: имена
 * опций знает она, не поле.
 *
 * `maxRows`, `contentFit`, `scrollBehavior`, `indicator` — общий с ListBox
 * контракт `IList`
 * (см. `custom/list/types.ts`), реализованный здесь своей копией: общего предка
 * у списка и поля выбора быть не может. Копии сверяет
 * `core/__tests__/list-contract.spec.ts`.
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

	static defaultValues: Partial<ISelectProps> = {
		...TInputControl.defaultValues,
		...LIST_DEFAULTS,
		open: false,
		placeholder: '',
		closeOnSelect: true,
		clearable: false,
		clearLabel: 'Clear',
		editable: false,
		editableMode: 'none',
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

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TSelect
		const own = props as Partial<ISelectProps>

		this._placeholder = own.placeholder ?? ctor.defaultValues.placeholder!
		this._closeOnSelect = own.closeOnSelect ?? ctor.defaultValues.closeOnSelect!
		this._clearLabel = own.clearLabel ?? ctor.defaultValues.clearLabel!

		this._maxRows = own.maxRows ?? ctor.defaultValues.maxRows!
		this._scrollBehavior = own.scrollBehavior ?? ctor.defaultValues.scrollBehavior!

		this._applyContentFit(own.contentFit ?? ctor.defaultValues.contentFit!)
		this._applyIndicator(own.indicator ?? ctor.defaultValues.indicator!)

		this._applyClearable(own.clearable ?? ctor.defaultValues.clearable!)
		// `_editableMode` — до `_applyEditable`: он пересчитывает
		// `aria-autocomplete` через `_syncAutocomplete()`, которому уже нужно
		// готовое значение режима.
		this._editableMode = own.editableMode ?? ctor.defaultValues.editableMode!
		this._applyEditable(own.editable ?? ctor.defaultValues.editable!)
		// Тем же правилом, что и сеттер `editable`, только без события — и
		// после `TInputControl`, поэтому проп `readonly` здесь перекрывается.
		this._applyReadonly(!this._editable)
		this._applyOpen(own.open ?? ctor.defaultValues.open!)

		// `_applyEditable` выше поменял `readonly`, а `_syncInputAccessibility()`
		// конструктор `TInputControl` вызвал ещё до него — пересчитываем
		// `aria-readonly` заново.
		this._syncInputAccessibility()

		// Роль и haspopup постоянны, а `aria-expanded` следует за панелью.
		// `aria-controls` и `aria-activedescendant` — не отсюда: они ссылаются
		// на список и опцию, а это знание коллекции.
		this._aria.add('role', 'combobox')
		this._aria.add('aria-haspopup', 'listbox')

		this.events.on('change:disabled', () => this._syncOpenable())

		this._syncOpenable()
	}

	/**
	 * Можно ли сейчас открыть панель.
	 *
	 * Раньше её запрещал ещё и `readonly`. Теперь `readonly` значит только
	 * «в поле нельзя печатать», и ставит его `editable`; select-only — это
	 * как раз `editable: false`, а ему панель и нужна. Остаётся `disabled`.
	 */
	get openable(): boolean {
		return !this.disabled
	}

	get open(): boolean {
		return this._open
	}

	set open(value: boolean) {
		if (this._open === value) return
		if (value && !this.openable) return

		this._applyOpen(value)
		;(this.events as TEvented<TSelectEvents>).emit('change:open', value)
		;(this.events as TEvented<TSelectEvents>).emit(value ? 'open' : 'close')
	}

	/**
	 * В `editable` открывает, но не закрывает: клик по тексту поля ставит
	 * курсор, и это не повод спрятать панель. Закрытие остаётся за `Escape`,
	 * выбором опции и нажатием мимо (`TDismissPlugin`).
	 */
	toggleOpen(): void {
		if (this._editable && this._open) return

		this.open = !this._open
	}

	get placeholder(): string {
		return this._placeholder
	}

	set placeholder(value: string) {
		if (this._placeholder === value) return

		this._placeholder = value
		;(this.events as TEvented<TSelectEvents>).emit('change:placeholder', value)
	}

	get closeOnSelect(): boolean {
		return this._closeOnSelect
	}

	set closeOnSelect(value: boolean) {
		if (this._closeOnSelect === value) return

		this._closeOnSelect = value
		;(this.events as TEvented<TSelectEvents>).emit('change:closeOnSelect', value)
	}

	get clearable(): boolean {
		return this._clearable
	}

	set clearable(value: boolean) {
		if (this._clearable === value) return

		this._applyClearable(value)
		;(this.events as TEvented<TSelectEvents>).emit('change:clearable', value)
	}

	get clearLabel(): string {
		return this._clearLabel
	}

	set clearLabel(value: string) {
		if (this._clearLabel === value) return

		this._clearLabel = value
		;(this.events as TEvented<TSelectEvents>).emit('change:clearLabel', value)
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
		;(this.events as TEvented<TSelectEvents>).emit('change:editable', value)

		this.readonly = !value
	}

	/**
	 * Что делает ввод текста при `editable: true`. Реакцию на сам ввод несёт
	 * `TEditablePlugin` — здесь только состояние с тремя значениями и
	 * `aria-autocomplete`, которое от него зависит.
	 *
	 * `search` — совпадение подсвечивается, список остаётся целым; `filter` —
	 * несовпавшие опции скрываются (`filter.query` коллекции); `none` — ввод
	 * не делает ничего, плагин в этом режиме даже не слушает поле.
	 */
	get editableMode(): TSelectEditableMode {
		return this._editableMode
	}

	set editableMode(value: TSelectEditableMode) {
		if (this._editableMode === value) return

		this._applyEditableMode(value)
		;(this.events as TEvented<TSelectEvents>).emit('change:editableMode', value)
	}

	/** Сколько строк показывать до появления прокрутки. `0` — все. */
	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows === value) return

		this._maxRows = value
		;(this.events as TEvented<TSelectEvents>).emit('change:maxRows', value)
	}

	/** Что делать с не помещающимся текстом. */
	get contentFit(): TListContentFit {
		return this._contentFit
	}

	set contentFit(value: TListContentFit) {
		if (this._contentFit === value) return

		this._applyContentFit(value)
		;(this.events as TEvented<TSelectEvents>).emit('change:contentFit', value)
	}

	/** Как прокручивать к опции при навигации. */
	get scrollBehavior(): TScrollBehavior {
		return this._scrollBehavior
	}

	set scrollBehavior(value: TScrollBehavior) {
		if (this._scrollBehavior === value) return

		this._scrollBehavior = value
		;(this.events as TEvented<TSelectEvents>).emit('change:scrollBehavior', value)
	}

	/** Где показывать отметку выбранной опции. */
	get indicator(): TListIndicator {
		return this._indicator
	}

	set indicator(value: TListIndicator) {
		if (this._indicator === value) return

		this._applyIndicator(value)
		;(this.events as TEvented<TSelectEvents>).emit('change:indicator', value)
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
		this._aria.add('aria-expanded', value ? 'true' : 'false')
		// То же состояние для темы: она разворачивает стрелку по `data-open`.
		// ARIA и `data-*` пишутся рядом — так их не рассинхронизировать.
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
	 * принимает текст, обещать автодополнение нечему. `editable` с режимом
	 * `none` — `"none"`, честный сигнал, что текст принимается, но без
	 * подсказок. `search`/`filter` — `"list"`: панель на вводе открывается и
	 * совпадение объявляется через `aria-activedescendant`, то есть подсказка
	 * скринридеру уже есть.
	 */
	protected _syncAutocomplete(): void {
		if (!this._editable) {
			this._aria.add('aria-autocomplete', null)

			return
		}

		this._aria.add('aria-autocomplete', this._editableMode === 'none' ? 'none' : 'list')
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
	 * Поле всегда в порядке обхода, но пока открывать нечего — панель
	 * закрывается. Иначе `open`, выставленный до `disabled`, остался бы висеть.
	 */
	protected _syncOpenable(): void {
		this._aria.add('tabindex', this.disabled ? null : '0')

		if (!this.openable && this._open) this.open = false
	}

	/**
	 * Собственный тег поля — `div`, у него нет ни нативного `required`, ни
	 * `readonly`. Оба ARIA-атрибута при включённом состоянии ставятся всегда.
	 */
	protected override _syncInputAccessibility(): void {
		this._aria.add('aria-required', this.required ? 'true' : null)
		this._aria.add('aria-readonly', this.readonly ? 'true' : null)
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
			maxRows: this._maxRows,
			contentFit: this._contentFit,
			scrollBehavior: this._scrollBehavior,
			indicator: this._indicator,
		} as TProps
	}
}
