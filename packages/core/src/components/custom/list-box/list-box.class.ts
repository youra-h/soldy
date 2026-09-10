import { TValueControl } from '../../base/value-control'
import type { IComponentOptions } from '../../base/component'
import { TEvented } from '../../../common'
import type { TScrollBehavior } from '../../../common'
import { LIST_DEFAULTS, LIST_CONTENT_FIT_ATTRIBUTE, LIST_INDICATOR_ATTRIBUTE } from '../list'
import type { TListContentFit, TListIndicator } from '../list'
import type {
	IListBoxProps,
	TListBoxView,
	TListBoxEvents,
	TListBoxStates,
	IListBox,
	TListBoxValue,
} from './types'

/**
 * Компонент ListBox — список с выбором.
 *
 * Раньше между ним и `TValueControl` стоял `TList`. Слоя не стало: наследник у
 * него был ровно один, а Select, которому те же свойства нужны не меньше, всё
 * равно оставался в стороне — он растёт от `TInputControl`.
 *
 * `TValueControl`, а не `TControl`: выбор у списка был всегда, но отдавался
 * наружу списком объектов — внутренней моделью коллекции. Потребителю нужен
 * ответ в значениях, и он же уходит в форму. Связь `value` ↔ выбор держит
 * `TValueSelectionExtension`.
 *
 * `maxRows`, `contentFit`, `scrollBehavior`, `indicator` объявлены контрактом `IList`
 * (см. `custom/list/types.ts`) и реализованы здесь же — своей копией. Копия
 * сознательная: общего предка у списка и поля выбора быть не может, а попытка
 * отдать свойства плагину сделала ядро несамодостаточным. Расхождение копий
 * стережёт `core/__tests__/list-contract.spec.ts`.
 *
 * Применять их ядру по силам не всё: `contentFit` уходит в `data-*`, что ядру
 * доступно, а `maxRows` требует измерений — его применяет `TListHeightPlugin`,
 * читая свойство отсюда. `scrollBehavior` отсюда только читают.
 */
export class TListBox
	extends TValueControl<TListBoxValue, IListBoxProps, TListBoxEvents, TListBoxStates>
	implements IListBox
{
	static override baseClass = 's-list-box'

	static defaultValues: Partial<IListBoxProps> = {
		...TValueControl.defaultValues,
		...LIST_DEFAULTS,
		view: 'plain',
	}

	protected _view!: TListBoxView
	protected _maxRows: number
	protected _contentFit!: TListContentFit
	protected _scrollBehavior: TScrollBehavior
	protected _indicator!: TListIndicator

	constructor(
		props: Partial<IListBoxProps> = {},
		options: IComponentOptions<TListBoxStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TListBox

		this._applyView(props.view ?? ctor.defaultValues.view!)

		this._maxRows = props.maxRows ?? ctor.defaultValues.maxRows!
		this._scrollBehavior = props.scrollBehavior ?? ctor.defaultValues.scrollBehavior!

		this._applyContentFit(props.contentFit ?? ctor.defaultValues.contentFit!)
		this._applyIndicator(props.indicator ?? ctor.defaultValues.indicator!)
	}

	get view(): TListBoxView {
		return this._view
	}

	set view(value: TListBoxView) {
		if (this._view === value) return

		this._applyView(value, this._view)
		;(this.events as TEvented<TListBoxEvents>).emit('change:view', value)
	}

	/** Сколько строк показывать до появления прокрутки. `0` — все. */
	get maxRows(): number {
		return this._maxRows
	}

	set maxRows(value: number) {
		if (this._maxRows === value) return

		this._maxRows = value
		;(this.events as TEvented<TListBoxEvents>).emit('change:maxRows', value)
	}

	/** Что делать с не помещающимся текстом. */
	get contentFit(): TListContentFit {
		return this._contentFit
	}

	set contentFit(value: TListContentFit) {
		if (this._contentFit === value) return

		this._applyContentFit(value)
		;(this.events as TEvented<TListBoxEvents>).emit('change:contentFit', value)
	}

	/** Как прокручивать к элементу при навигации. */
	get scrollBehavior(): TScrollBehavior {
		return this._scrollBehavior
	}

	set scrollBehavior(value: TScrollBehavior) {
		if (this._scrollBehavior === value) return

		this._scrollBehavior = value
		;(this.events as TEvented<TListBoxEvents>).emit('change:scrollBehavior', value)
	}

	/** Где показывать отметку выбранного элемента. */
	get indicator(): TListIndicator {
		return this._indicator
	}

	set indicator(value: TListIndicator) {
		if (this._indicator === value) return

		this._applyIndicator(value)
		;(this.events as TEvented<TListBoxEvents>).emit('change:indicator', value)
	}

	protected _applyView(newValue: TListBoxView, oldValue?: TListBoxView): void {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		this._view = newValue
	}

	/**
	 * `data-content-fit`, а не класс: то же имя получает каждый элемент, и тема
	 * читает одно свойство на двух уровнях — `expand` со списка (ширина
	 * контейнера), `wrap` с элемента (перенос текста).
	 */
	protected _applyContentFit(value: TListContentFit): void {
		this._contentFit = value
		this._dataset.add(LIST_CONTENT_FIT_ATTRIBUTE, value)
	}

	/**
	 * `data-indicator` на самом списке: место под отметку резервирует тема, и
	 * знать сторону ей надо до того, как что-то выбрано. Тот же атрибут каждому
	 * элементу ставит `TListBoxExtension`.
	 */
	protected _applyIndicator(value: TListIndicator): void {
		this._indicator = value
		this._dataset.add(LIST_INDICATOR_ATTRIBUTE, value)
	}

	override getProps(): IListBoxProps {
		return {
			...super.getProps(),
			view: this._view,
			maxRows: this._maxRows,
			contentFit: this._contentFit,
			scrollBehavior: this._scrollBehavior,
			indicator: this._indicator,
		} as IListBoxProps
	}
}
