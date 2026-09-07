import { TComponent } from '../component'
import type { IComponentOptions } from '../component'
import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
	TDirection,
} from './types'
import { TClasses, TAria, TStateUnit, TVisibilityState, TActionEvent } from '../../../common'
import type { IVisibilityState, TValuePayload } from '../../../common'
import { TEvented } from '../../../common'

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
	TStates extends TComponentViewStates = TComponentViewStates,
>
	extends TComponent<TProps, TEvents, TStates>
	implements IComponentView<TProps, TEvents, TStates>
{
	/** Базовый CSS-класс по умолчанию (можно переопределить в наследниках). */
	static baseClass = 's-component-view'

	static defaultValues: Partial<IComponentViewProps> = {
		...TComponent.defaultValues,
		rendered: true,
		visible: true,
		tag: 'div',
		direction: 'inherit',
	}

	protected _tag: string | object
	protected _direction: TDirection
	protected _classes: TClasses
	protected _aria: TAria
	protected _ready: boolean = false

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		const ctor = new.target as typeof TComponentView

		super(props, options)

		const rendered = props.rendered ?? (ctor.defaultValues.rendered as boolean)
		const visible = props.visible ?? (ctor.defaultValues.visible as boolean)

		this._states.rendered =
			options.states?.rendered ??
			(new TStateUnit<boolean>({ initial: rendered }) as TStates['rendered'])
		this._states.visible =
			options.states?.visible ??
			(new TVisibilityState({ initial: visible }) as TStates['visible'])

		this._states.rendered.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentViewEvents>).emit(
				'change:rendered',
				payload.newValue,
			)
			this._emitPresent()
		})
		this._states.visible.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentViewEvents>).emit(
				'change:visible',
				payload.newValue,
			)
			this._emitPresent()
		})

		this._tag = props.tag ?? ctor.defaultValues.tag!

		this._direction = props.direction ?? (ctor.defaultValues.direction as TDirection)

		this._classes = new TClasses(ctor.baseClass)

		this._classes.events.on('change', () =>
			(this.events as TEvented<TComponentViewEvents>).emit(
				'change:classes',
				this._classes.toArray(),
			),
		)

		this._aria = new TAria()

		this._aria.events.on('change', () =>
			(this.events as TEvented<TComponentViewEvents>).emit('change:aria', this._aria.toObject()),
		)
	}

	get present(): boolean {
		return this.rendered && this.visible
	}

	private _emitPresent(): void {
		;(this.events as TEvented<TComponentViewEvents>).emit('change:present', this.present)
	}

	get rendered(): boolean {
		return this._states.rendered.value
	}
	set rendered(value: boolean) {
		if (value === this._states.rendered.value) return
		this._states.rendered.value = value
	}

	get visible(): boolean {
		return this._states.visible.value
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
		;(this.events as TEvented<TComponentViewEvents>).emit('show:before', e)
		if (e.defaultPrevented) return
		;(this._states.visible as IVisibilityState).show()
		;(this.events as TEvented<TComponentViewEvents>).emit('show')

		this.afterShow()
		;(this.events as TEvented<TComponentViewEvents>).emit('show:after')
	}

	hide(): void {
		if (!this.visible) return

		if (!this.beforeHide()) return

		const e = new TActionEvent()
		;(this.events as TEvented<TComponentViewEvents>).emit('hide:before', e)
		if (e.defaultPrevented) return
		;(this._states.visible as IVisibilityState).hide()
		;(this.events as TEvented<TComponentViewEvents>).emit('hide')

		this.afterHide()
		;(this.events as TEvented<TComponentViewEvents>).emit('hide:after')
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

	get tag(): string | object {
		return this._tag
	}
	set tag(value: string | object) {
		if (this._tag === value) return

		this._tag = value
		;(this.events as TEvented<TComponentViewEvents>).emit('change:tag', value)
	}

	get direction(): TDirection {
		return this._direction
	}
	set direction(value: TDirection) {
		if (this._direction === value) return

		this._direction = value
		;(this.events as TEvented<TComponentViewEvents>).emit('change:direction', value)
	}

	/**
	 * Значение атрибута `dir` для разметки. `'inherit'` → `null`: атрибут не
	 * ставится, направление берётся от предка. Перевод сентинела в DOM-значение
	 * живёт здесь, а не в шести адаптерах.
	 */
	get dir(): 'ltr' | 'rtl' | null {
		return this._direction === 'inherit' ? null : this._direction
	}

	get ready(): boolean {
		return this._ready
	}
	set ready(value: boolean) {
		if (this._ready === value) return

		this._ready = value
		;(this.events as TEvented<TComponentViewEvents>).emit('ready', value)
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
