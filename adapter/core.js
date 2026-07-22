
// === ./soldy/packages\core\src\components\base\entity\entity.class.ts ===

import type { TEntityProps, IEntity } from './types'
import { createUid } from '../../../common'

export abstract class TEntity<TProps extends TEntityProps = TEntityProps> implements IEntity<TProps> {
	/** Уникальный идентификатор объекта в рамках текущей сессии */
	public readonly uid: number = createUid()

	getProps(): Readonly<TProps> {
		return {} as TProps
	}

	assign(source: Partial<TProps>): void {
		if (!source) return

		const keys = Object.keys(this.getProps()) as (keyof TProps)[]

		for (const key of keys) {
			if (source[key] !== undefined) {
				// @ts-expect-error dynamic assignment via setter
				this[key] = source[key]
			}
		}
	}

	/**
	 * Сериализация объекта в JSON.
	 * Возвращает копию props, пригодную для сохранения или передачи.
	 */
	toJSON(): TProps {
		return { ...this.getProps() } as TProps
	}
}


// === ./soldy/packages\core\src\components\base\entity\types.ts ===

// Общий тип props (универсальный, для базовых объектов)
// Используется только там, где нужен "свободный словарь"
// export type TEntityProps = Record<string, unknown>
export type TEntityProps = {}

// Интерфейс для объектов, поддерживающих присвоение свойств из другого объекта
export interface IAssignable<T = TEntityProps> {
	assign(source: Partial<T>): void
}

// Параметризуемый базовый объект
export interface IEntity<TProps = TEntityProps> extends IAssignable<TProps> {
	/** Уникальный идентификатор объекта в рамках текущей сессии */
	readonly uid: number
	// Возвращает свойства объекта (только для чтения)
	getProps(): Readonly<TProps>
	// Сериализация объекта в JSON
	toJSON(): TProps
}


// === ./soldy/packages\core\src\components\base\component\component.class.ts ===

import { TEntity } from '../entity'
import { TEvented, TStateUnit, TVisibilityState } from '../../../common'
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

	constructor(options: IComponentOptions<TProps, TStates> | Partial<TProps> = {}) {
		const ctor = new.target as typeof TComponent

		const { props = {} as Partial<TProps>, states } = ctor.prepareOptions<TProps, TStates>(
			options,
		)
		super()

		this.events = new TEvented<TEvents>()

		// Инициализируем состояния видимости
		const rendered = props.rendered ?? (ctor.defaultValues.rendered as boolean)
		const visible = props.visible ?? (ctor.defaultValues.visible as boolean)

		this._states.rendered =
			states?.rendered ??
			(new TStateUnit<boolean>({ initial: rendered }) as TStates['rendered'])
		this._states.visible =
			states?.visible ?? (new TVisibilityState({ initial: visible }) as TStates['visible'])

		this._states.rendered.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentEvents>).emit('change:rendered', payload.newValue)
			this._emitPresent()
		})
		this._states.visible.events.on('change', (payload: TValuePayload<boolean>) => {
			;(this.events as TEvented<TComponentEvents>).emit('change:visible', payload.newValue)
			this._emitPresent()
		})

		queueMicrotask(() => (this.events as TEvented<TComponentEvents>).emit('created', this))
	}

	static prepareOptions<TProps extends IComponentProps = IComponentProps, TStates = any>(
		options: IComponentOptions<TProps, TStates> | Partial<TProps>,
	): { props: Partial<TProps>; states?: Partial<TStates> } {
		const raw = options as Record<string, unknown>
		const hasPropsKey = Object.prototype.hasOwnProperty.call(raw, 'props')
		const hasStatesKey = Object.prototype.hasOwnProperty.call(raw, 'states')
		const hasRenderConfigKey = Object.prototype.hasOwnProperty.call(raw, 'renderConfig')

		// Если есть props/states/renderConfig — это точно options-объект
		const isOptionsObject = hasPropsKey || hasStatesKey || hasRenderConfigKey

		if (isOptionsObject) {
			const opt = options as IComponentOptions<TProps, TStates>
			const props = (opt.props ?? {}) as Partial<TProps>

			return {
				props,
				states: opt.states,
			}
		}

		// Иначе это plain props
		const props = options as Partial<TProps>

		return {
			props,
		}
	}

	static create<T extends TComponent>(
		this: new (options: any) => T,
		props?: Partial<T extends TComponent<infer P> ? P : IComponentProps>,
	): T {
		return new this({ props: props ?? {} })
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

		const canShow = (this.events as TEvented<TComponentEvents>).emitWithResult('show:before')
		if (!canShow) return

		if (this.visible) return
		;(this._states.visible as IVisibilityState).show()
		;(this.events as TEvented<TComponentEvents>).emit('show')

		this.afterShow()
		;(this.events as TEvented<TComponentEvents>).emit('show:after')
	}

	hide(): void {
		if (!this.visible) return

		if (!this.beforeHide()) return

		const canHide = (this.events as TEvented<TComponentEvents>).emitWithResult('hide:before')
		if (!canHide) return
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


// === ./soldy/packages\core\src\components\base\component\types.ts ===

import type { IEntity } from '../entity'
import { TEvented } from '../../../common'
import type { IStateUnit } from '../../../common'
import type { IVisibilityState } from '../../../common'

export type TComponentEvents = {
	/** Создан (после конструктора, async). */
	created: (component: IComponent) => void
	/** show */
	show: () => void
	/** hide */
	hide: () => void
	/** show:before (можно отменить, вернув false) */
	'show:before': () => boolean
	/** show:after */
	'show:after': () => void
	/** hide:before (можно отменить, вернув false) */
	'hide:before': () => boolean
	/** hide:after */
	'hide:after': () => void

	/** change:visible */
	'change:visible': (value: boolean) => void
	/** change:rendered */
	'change:rendered': (value: boolean) => void
	/** change:present — rendered && visible */
	'change:present': (value: boolean) => void
}

export interface IComponentProps {
	/** Отрисован ли компонент (аналог v-if) */
	rendered?: boolean
	/** Виден ли компонент (логическая видимость) */
	visible?: boolean
}

export type TComponentStates = {
	/** Класс state для `rendered`. */
	rendered: IStateUnit<boolean>
	/** Класс state для `visible`. */
	visible: IVisibilityState
}

export interface IComponentMethods {
	/** Показать компонент */
	show(): void
	/** Скрыть компонент */
	hide(): void
}

export interface IComponent<
	TProps extends IComponentProps = IComponentProps,
	TEvents extends Record<string, (...args: any) => any> = TComponentEvents,
	TStates extends TComponentStates = TComponentStates,
>
	extends IEntity<TProps>, IComponentMethods {
	readonly events: TEvented<TEvents>
	readonly states: TStates
	/** Отрисован в DOM */
	rendered: boolean
	/** Логическая видимость */
	visible: boolean
	/** Компонент на экране: rendered && visible */
	readonly present: boolean
}

/**
 * Опции для создания компонента.
 * props — начальные свойства.
 * states — инъекция state-реализаций.
 */
export interface IComponentOptions<TProps, TStates = any> {
	props?: Partial<TProps>
	/**
	 * Инъекция state-реализаций.
	 * Нужна, чтобы менять поведение state свойств без оверрайда геттеров/сеттеров.
	 */
	states?: Partial<TStates>
}


// === ./soldy/packages\core\src\components\base\component-view\component-view.class.ts ===

import { TComponent } from '../component'
import type {
	IComponentViewOptions,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from './types'
import { TClasses } from '../../../common'
import { TEvented } from '../../../common'

/**
 * Web-component-view слой: tag/classes.
 *
 * Это слой, который удобен для UI-обёрток (Vue/React):
 * - `tag` (div/button/custom)
 * - `classes` (baseClass + динамические)
 *
 * visible/rendered наследуются от TComponent.
 */
export default class TComponentView<
	TProps extends IComponentViewProps = IComponentViewProps,
	TEvents extends TComponentViewEvents = TComponentViewEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
> extends TComponent<TProps, TEvents, TStates> {
	/** Базовый CSS-класс по умолчанию (можно переопределить в наследниках). */
	static baseClass = 's-component-view'

	static defaultValues: Partial<IComponentViewProps> = {
		...TComponent.defaultValues,
		tag: 'div',
	}

	protected _tag: string | object
	protected _classes: TClasses
	protected _ready: boolean = false

	constructor(options: IComponentViewOptions<TProps, TStates> | Partial<TProps> = {}) {
		const ctor = new.target as typeof TComponentView

		const { props = {} as Partial<TProps> } = ctor.prepareOptions<TProps, TStates>(
			options,
		)

		super(options)

		this._tag = props.tag ?? ctor.defaultValues.tag!

		this._classes = new TClasses(ctor.baseClass)

		this._classes.events.on('change', () =>
			(this.events as TEvented<TComponentViewEvents>).emit(
				'change:classes',
				this._classes.toArray(),
			),
		)
	}

	get classes(): TClasses {
		return this._classes
	}

	get tag(): string | object {
		return this._tag
	}
	set tag(value: string | object) {
		if (this._tag === value) return

		this._tag = value
		;(this.events as TEvented<TComponentViewEvents>).emit('change:tag', value)
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
			tag: this._tag,
		} as TProps
	}
}


// === ./soldy/packages\core\src\components\base\component-view\types.ts ===

import type { TClasses } from './../../../common'
import type {
	IComponent,
	IComponentOptions,
	IComponentProps,
	TComponentEvents,
	TComponentStates,
} from '../component'

export type TComponentViewStates = TComponentStates

export type TComponentViewEvents = TComponentEvents & {
	/** change:tag */
	'change:tag': (value: string | object) => void
	/** change:classes (без baseClass) */
	'change:classes': (value: string[]) => void
	/** ready — срабатывает когда компонент монтируется/демонтируется из DOM */
	'ready': (value: boolean) => void
}

export interface IComponentViewProps extends IComponentProps {
	tag?: string | object
}

/**
 * Опции для component-view-слоя.
 * props — начальные свойства, states — инъекция state-объектов.
 */
export interface IComponentViewOptions<
	TProps extends IComponentViewProps = IComponentViewProps,
	TStates extends TComponentViewStates = TComponentViewStates,
> extends IComponentOptions<TProps, TStates> {}

export interface IComponentView<
	TProps extends IComponentViewProps = IComponentViewProps,
	TEvents extends Record<string, (...args: any) => any> = TComponentViewEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
> extends IComponent<TProps, TEvents, TStates> {
	/** HTML-тег или компонент */
	tag: string | object
	/** CSS-классы (включая baseClass и динамические) */
	readonly classes: TClasses
	/** Компонент смонтирован в DOM и готов (устанавливается плагин-слоем) */
	ready: boolean
}


// === ./soldy/packages\core\src\components\custom\icon\icon.class.ts ===

import { TComponentView } from '../../base/component-view'
import type { IIcon, IIconProps, TIconEvents, TIconStates } from './types'
import type { IComponentViewOptions } from '../../base/component-view'
import { TStateUnit, TEvented } from '../../../common'
import type { TValuePayload, TComponentSize } from '../../../common'

export default class TIcon
	extends TComponentView<IIconProps, TIconEvents, TIconStates>
	implements IIcon
{
	static override baseClass = 's-icon'

	static defaultValues: Partial<IIconProps> = {
		...TComponentView.defaultValues,
		size: 'normal',
		tag: 'error',
	}

	protected _width: string | number | undefined
	protected _height: string | number | undefined

	constructor(
		options: IComponentViewOptions<IIconProps, TIconStates> | Partial<IIconProps> = {},
	) {
		super(options)

		const ctor = new.target as typeof TIcon

		const { props = {} as Partial<IIconProps>, states } = TComponentView.prepareOptions<
			IIconProps,
			TIconStates
		>(options)

		this._states.size =
			states?.size ??
			new TStateUnit<TComponentSize>({
				initial: (props.size ?? ctor.defaultValues.size!) as TComponentSize,
			})

		this._states.size.events.on('change', (payload: TValuePayload<TComponentSize>) => {
			this._classes.swapClass({
				oldClass: `--size-${payload.oldValue}`,
				newClass: `--size-${payload.newValue}`,
			})
			;(this.events as TEvented<TIconEvents>).emit('change:size' as any, payload)
		})

		this._classes.add(`--size-${this._states.size.value}`, true)

		this._width = props.width
		this._height = props.height
	}

	get width(): string | number | undefined {
		return this._width
	}

	set width(value: string | number | undefined) {
		if (this._width !== value) {
			this._width = value
			;(this.events as TEvented<TIconEvents>).emit('change:width', value)
		}
	}

	get height(): string | number | undefined {
		return this._height
	}

	set height(value: string | number | undefined) {
		if (this._height !== value) {
			this._height = value
			;(this.events as TEvented<TIconEvents>).emit('change:height', value)
		}
	}

	get size(): TComponentSize {
		return this._states.size.value
	}

	set size(value: TComponentSize) {
		if (value === this._states.size.value) return

		this._states.size.value = value
	}

	/**
	 * Получает экземпляр иконки.
	 * @param value Значение, по которому нужно получить иконку, если это уже экземпляр TIcon, он будет возвращен как есть, иначе будет создан новый экземпляр.
	 * @returns Экземпляр иконки.
	 */
	static getInstance(value: TIcon | Object): TIcon {
		if (value instanceof TIcon) {
			return value
		}

		// Если value - объект, создаем новый экземпляр с его свойствами
		if (value && value instanceof Object && 'tag' in value) {
			return new TIcon({ props: value as any })
		}

		// Иначе value - это объект с иконкой
		return new TIcon({ props: { tag: value } })
	}

	getProps(): IIconProps {
		return {
			...super.getProps(),
			size: this._states.size.value,
			width: this._width,
			height: this._height,
		}
	}
}


// === ./soldy/packages\core\src\components\custom\icon\types.ts ===

import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
	TComponentViewStates,
} from '../../base/component-view'
import type { IStateUnit, TValuePayload, TComponentSize } from '../../../common'

export interface IIconProps extends IComponentViewProps {
	// Размер иконки
	size?: TComponentSize
	// Ширина иконки
	width?: number | string
	// Высота иконки
	height?: number | string
}

export type TIconStates = TComponentViewStates & {
	size: IStateUnit<TComponentSize>
}

export type TIconEvents = TComponentViewEvents & {
	/** change:size */
	'change:size': (payload: TValuePayload<TComponentSize>) => void
	'change:width': (value: number | string | undefined) => void
	'change:height': (value: number | string | undefined) => void
}

export interface IIcon extends IComponentView<IIconProps, TIconEvents, TIconStates> {
	/** Размер иконки */
	size: TComponentSize
	/** Ширина иконки */
	width?: number | string
	/** Высота иконки */
	height?: number | string
}


