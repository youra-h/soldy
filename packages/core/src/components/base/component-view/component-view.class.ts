import { TComponent } from '../component'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IComponentView, IComponentViewProps, TComponentViewEvents, TDirection } from './types'
import { TClasses, TAria, TDataset, TAttributes, TActionEvent, TChangeEvent } from '../../../common'
import type { TEventSink } from '../../../common'

/**
 * Визуальный слой: всё, что связано с отображением.
 *
 * - `rendered` / `visible` / `present` + show()/hide()
 * - `tag` (div/button/custom)
 * - `classes` (baseClass + динамические)
 * - `ready` (компонент смонтирован в DOM)
 *
 * Невизуальные компоненты наследуются напрямую от TComponent и ничего
 * из этого не получают.
 */
export default class TComponentView<
	TProps extends IComponentViewProps = IComponentViewProps,
	TEvents extends TComponentViewEvents = TComponentViewEvents,
>
	extends TComponent<TProps, TEvents>
	implements IComponentView<TProps, TEvents>
{
	/** Базовый CSS-класс по умолчанию (можно переопределить в наследниках). */
	static baseClass = 's-component-view'

	static defaultValues: typeof TComponent.defaultValues &
		TDefaultValues<IComponentViewProps, 'rendered' | 'visible' | 'tag' | 'direction'> = {
		...TComponent.defaultValues,
		rendered: true,
		visible: true,
		tag: 'div',
		direction: 'inherit',
	}

	protected readonly _idBase: string
	protected _rendered: boolean
	protected _visible: boolean
	protected _tag: string | object
	protected _direction: TDirection
	protected _classes: TClasses
	protected _aria: TAria
	protected _dataset: TDataset
	protected _attrs: TAttributes
	protected _ready: boolean = false

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		const ctor = new.target as typeof TComponentView

		super(props, options)

		this._idBase = options.idBase || String(this.uid)

		this._rendered = props.rendered ?? ctor.defaultValues.rendered
		this._visible = props.visible ?? ctor.defaultValues.visible

		this._tag = props.tag ?? ctor.defaultValues.tag

		this._direction = props.direction ?? ctor.defaultValues.direction

		this._classes = new TClasses(ctor.baseClass)

		this._classes.events.on('change', () =>
			this._sink.emit('change:classes', this._classes.toArray()),
		)

		this._aria = new TAria()

		this._aria.events.on('change', () => this._sink.emit('change:aria', this._aria.toObject()))

		this._dataset = new TDataset()

		this._dataset.events.on('change', () =>
			this._sink.emit('change:dataset', this._dataset.toObject()),
		)

		this._attrs = new TAttributes()

		this._attrs.events.on('change', () =>
			this._sink.emit('change:attrs', this._attrs.toObject()),
		)

		this.events.on('change:direction', () => this._syncDir())
		this._syncDir()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TComponentViewEvents> {
		return this.events
	}

	/**
	 * `uid` — счётчик процесса: на сервере он общий для всех запросов, в
	 * браузере начинается заново, и `id` от него расходились при гидратации.
	 * Опцию `idBase` адаптер берёт у фреймворка (`useId`), а тот выводит её из
	 * места компонента в дереве; без опции — `uid`, как раньше.
	 */
	get idBase(): string {
		return this._idBase
	}

	get present(): boolean {
		return this.rendered && this.visible
	}

	private _emitPresent(): void {
		this._sink.emit('change:present', this.present)
	}

	get rendered(): boolean {
		return this._rendered
	}
	set rendered(value: boolean) {
		if (value === this._rendered) return

		const e = new TChangeEvent(value, this._rendered)

		this._sink.emit('change:rendered:before', e)

		if (e.defaultPrevented || e.value === this._rendered) return

		this._rendered = e.value
		this._sink.emit('change:rendered', e.value)
		this._emitPresent()
	}

	get visible(): boolean {
		return this._visible
	}
	set visible(value: boolean) {
		if (value) {
			this.show()
		} else {
			this.hide()
		}
	}

	show(): void {
		// Проверка до эмитов — иначе show() на уже видимом компоненте выдаёт
		// show:before без изменения состояния (hide() симметрично проверяет первым).
		if (this.visible) return

		if (!this.beforeShow()) return

		const e = new TActionEvent()
		this._sink.emit('show:before', e)
		if (e.defaultPrevented) return
		this._setVisible(true)
		this._sink.emit('show')

		this.afterShow()
		this._sink.emit('show:after')
	}

	hide(): void {
		if (!this.visible) return

		if (!this.beforeHide()) return

		const e = new TActionEvent()
		this._sink.emit('hide:before', e)
		if (e.defaultPrevented) return
		this._setVisible(false)
		this._sink.emit('hide')

		this.afterHide()
		this._sink.emit('hide:after')
	}

	/**
	 * Запись видимости. Расширяют её `show:before` и `hide:before` — своего
	 * `change:visible:before` у видимости нет, это был бы второй путь.
	 */
	private _setVisible(value: boolean): void {
		this._visible = value
		this._sink.emit('change:visible', value)
		this._emitPresent()
	}

	protected beforeShow(): boolean {
		return true
	}

	protected afterShow(): void {}

	protected beforeHide(): boolean {
		return true
	}

	protected afterHide(): void {}

	get classes(): TClasses {
		return this._classes
	}

	/**
	 * Набор атрибутов доступности — живой объект, как `classes`.
	 *
	 * Пуст у самого по себе визуального слоя: семантики у него нет. Пишут в
	 * него все, кому есть что сказать об этом элементе, — наследники (роль),
	 * плагины (`TAriaPlugin` — имя), расширения коллекции (связки и
	 * состояние). Разметка биндит один набор: `v-bind="aria"`.
	 *
	 * За границу core → ui уходит снимок: адаптер читает проп через
	 * `valueOf()`, а не держит ссылку на этот объект.
	 */
	get aria(): TAria {
		return this._aria
	}

	/**
	 * Набор `data-*` — то же самое, но для темы.
	 *
	 * Отдельный от `aria` намеренно: ARIA — контракт со скринридером, `data-*`
	 * — с CSS, и связать их значило бы чинить доступность ценой поломки вида.
	 * Пишутся оба обычно рядом, в одном месте (`aria.add('aria-selected', …)` и
	 * `dataset.add('selected', …)`), а вот биндятся часто к разным элементам:
	 * роль живёт там, где её ждёт скринридер, а класс — там, где его ждёт тема.
	 *
	 * Приведение к строке делает сам набор — ради того, чтобы
	 * `String(selected)` не повторялся в шаблоне каждого адаптера.
	 */
	get dataset(): TDataset {
		return this._dataset
	}

	/**
	 * Нативные атрибуты, зависящие от тега корня, — третий набор рядом с
	 * `aria`/`dataset`. Сам `TComponentView` пишет сюда `dir` по `direction`
	 * (`'inherit'` атрибут снимает — направление наследуется от предка).
	 * `TControl` дописывает `disabled`, когда тег умеет его сам (см.
	 * `NATIVE_DISABLED_TAGS`).
	 *
	 * Отдельный от `aria` и `dataset` набор, а не запись в один из них:
	 * `aria-disabled` — контракт со скринридером, `data-*` — с CSS, а здесь
	 * нативный HTML-атрибут, который решает поведение элемента (блокирует
	 * фокус и исключает его из отправки формы), а не описывает его для чужого
	 * потребителя.
	 */
	get attrs(): TAttributes {
		return this._attrs
	}

	get tag(): string | object {
		return this._tag
	}
	set tag(value: string | object) {
		if (this._tag === value) return

		this._tag = value
		this._sink.emit('change:tag', value)
	}

	get direction(): TDirection {
		return this._direction
	}
	set direction(value: TDirection) {
		if (this._direction === value) return

		this._direction = value
		this._sink.emit('change:direction', value)
	}

	/**
	 * Пишет `dir` в общий набор нативных атрибутов рядом с `disabled`
	 * (`TControl._syncDisabled`) — один путь в разметку вместо отдельного
	 * пропа `dir`, который раньше вычисляли в шести адаптерах.
	 *
	 * `'inherit'` → `null`: атрибут не ставится, направление наследуется от
	 * предка.
	 */
	private _syncDir(): void {
		this._attrs.add('dir', this._direction === 'inherit' ? null : this._direction)
	}

	get ready(): boolean {
		return this._ready
	}
	set ready(value: boolean) {
		if (this._ready === value) return

		this._ready = value
		this._sink.emit('ready', value)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			rendered: this.rendered,
			visible: this.visible,
			tag: this._tag,
			direction: this._direction,
		} as TProps
	}
}
