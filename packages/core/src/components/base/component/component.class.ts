import { TEntity } from '../entity'
import { TEvented, TStateUnit, TVisibilityState, TActionEvent } from '../../../common'
import type { IVisibilityState, TValuePayload } from '../../../common'
import type {
	IComponent,
	IComponentOptions,
	IComponentProps,
	TComponentEvents,
	TComponentStates,
} from './types'

/**
 * Headless-модель компонента.
 *
 * База для всех компонентов. Хранит `events`, `visible`, `rendered`.
 */
export default class TComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends TComponentEvents = TComponentEvents,
	TStates extends TComponentStates = TComponentStates,
>
	extends TEntity<TProps>
	implements IComponent<TProps, TEvents, TStates>
{
	static defaultValues: Partial<IComponentProps> = {
		rendered: true,
		visible: true,
	}

	protected _states = {} as TStates
	public readonly events: TEvented<TEvents>

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		const ctor = new.target as typeof TComponent

		super()

		this.events = new TEvented<TEvents>()

		// Инициализируем состояния видимости
		const rendered = props.rendered ?? (ctor.defaultValues.rendered as boolean)
		const visible = props.visible ?? (ctor.defaultValues.visible as boolean)

		this._states.rendered =
			options.states?.rendered ??
			(new TStateUnit<boolean>({ initial: rendered }) as TStates['rendered'])
		this._states.visible =
			options.states?.visible ??
			(new TVisibilityState({ initial: visible }) as TStates['visible'])

		this._states.rendered.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentEvents>).emit('change:rendered', payload.newValue)
			this._emitPresent()
		})
		this._states.visible.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentEvents>).emit('change:visible', payload.newValue)
			this._emitPresent()
		})
	}

	static create<T extends TComponent>(
		this: new (...args: any[]) => T,
		props?: Partial<T extends TComponent<infer P> ? P : IComponentProps>,
		options?: IComponentOptions<T extends TComponent<any, any, infer S> ? S : any>,
	): T {
		return new this(props ?? {}, options ?? {})
	}

	get states(): TStates {
		return this._states
	}

	get present(): boolean {
		return this.rendered && this.visible
	}

	private _emitPresent(): void {
		;(this.events as TEvented<TComponentEvents>).emit('change:present', this.present)
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
		if (!this.beforeShow()) return

		const e = new TActionEvent()
		;(this.events as TEvented<TComponentEvents>).emit('show:before', e)
		if (e.defaultPrevented) return

		if (this.visible) return
		;(this._states.visible as IVisibilityState).show()
		;(this.events as TEvented<TComponentEvents>).emit('show')

		this.afterShow()
		;(this.events as TEvented<TComponentEvents>).emit('show:after')
	}

	hide(): void {
		if (!this.visible) return

		if (!this.beforeHide()) return

		const e = new TActionEvent()
		;(this.events as TEvented<TComponentEvents>).emit('hide:before', e)
		if (e.defaultPrevented) return
		;(this._states.visible as IVisibilityState).hide()
		;(this.events as TEvented<TComponentEvents>).emit('hide')

		this.afterHide()
		;(this.events as TEvented<TComponentEvents>).emit('hide:after')
	}

	protected beforeShow(): boolean {
		return true
	}

	protected afterShow(): void {}

	protected beforeHide(): boolean {
		return true
	}

	protected afterHide(): void {}

	getProps(): TProps {
		return {
			...super.getProps(),
			rendered: this.rendered,
			visible: this.visible,
		} as TProps
	}
}
