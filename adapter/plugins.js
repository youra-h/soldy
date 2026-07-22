
// === ./soldy/packages\plugins\src\base\plugin.ts ===

import { TEvented } from '@soldy/core'
import type { IPlugin, IPluginBundle, TPluginEvents, TBasePluginEvents } from './types'

export abstract class TBasePlugin<
	TCustomEvents extends Record<string, (...args: any) => any> = {},
> implements IPlugin<TPluginEvents<TCustomEvents>> {
	get key(): symbol {
		return (this.constructor as unknown as { key: symbol }).key
	}

	readonly events = new TEvented<TPluginEvents<TCustomEvents>>()

	install(_bundle: IPluginBundle): void {}

	destroy(): void {
		(this.events as TEvented<TBasePluginEvents>).emit('destroyed');
	}
}


// === ./soldy/packages\plugins\src\base\bundle.ts ===

import type { IPlugin, IPluginBundle, TPluginConstructor } from './types'

export class TPluginBundle implements IPluginBundle {
	private _plugins = new Map<symbol, IPlugin>()

	use<P extends IPlugin>(PluginCtor: TPluginConstructor<P>): IPluginBundle {
		const plugin = new PluginCtor()
		// Если плагин с таким ключом уже существует, удаляем его
		this._plugins.set(PluginCtor.key, plugin)
		plugin.install(this)

		return this
	}

	get<P extends IPlugin>(ctor: TPluginConstructor<P>): P | undefined
	get(key: symbol): IPlugin | undefined
	get<P extends IPlugin>(ctorOrKey: TPluginConstructor<P> | symbol): P | IPlugin | undefined {
		const key = typeof ctorOrKey === 'symbol' ? ctorOrKey : ctorOrKey.key

		return this._plugins.get(key) as P | undefined
	}

	remove<P extends IPlugin>(PluginCtor: TPluginConstructor<P>): void {
		const plugin = this._plugins.get(PluginCtor.key)

		plugin?.destroy()

		this._plugins.delete(PluginCtor.key)
	}
}


// === ./soldy/packages\plugins\src\base\types.ts ===

import type { TEvented } from '@soldy/core'

export type TBasePluginEvents = {
	destroyed: () => void
}

export type TPluginEvents<T extends Record<string, (...args: any) => any> = {}> = T &
	TBasePluginEvents

export interface IPlugin<TEvents extends TBasePluginEvents = TBasePluginEvents> {
	readonly key: symbol
	readonly events: TEvented<TEvents>
	/** Вызывается контейнером при добавлении плагина через use(). Используй для подписки на другие плагины. */
	install(bundle: IPluginBundle): void
	/** Вызывается контейнером при удалении через remove(). Используй для отписки от событий и очистки ресурсов. */
	destroy(): void
}

export interface IPluginBundle {
	use<P extends IPlugin>(PluginCtor: TPluginConstructor<P>): IPluginBundle
	get<P extends IPlugin>(ctor: TPluginConstructor<P>): P | undefined
	get(key: symbol): IPlugin | undefined
	remove<P extends IPlugin>(PluginCtor: TPluginConstructor<P>): void
}

export type TPluginConstructor<P extends IPlugin = IPlugin> = {
	new (): P
	readonly key: symbol
}

export type TBundleFactory = () => IPluginBundle


// === ./soldy/packages\plugins\src\base\css-value.ts ===

const CSS_UNIT_RE = /^-?\d+(\.\d+)?$/u

/**
 * Приводит значение к CSS-строке.
 * - Число → `${value}px`
 * - Строка-число (например `'100'`) → `'100px'`
 * - Строка с единицей (например `'50%'`, `'1rem'`) → как есть
 * - `'auto'` → как есть
 */
export function toCssValue(value: string | number): string {
	if (typeof value === 'number') {
		return `${value}px`
	}

	if (CSS_UNIT_RE.test(value)) {
		return `${value}px`
	}

	return value
}


// === ./soldy/packages\plugins\src\common\element\element.plugin.ts ===

import { TBasePlugin } from '../../base'
import type { TElementPluginEvents } from './types'
import { TEvented } from '@soldy/core'

export class TElementPlugin extends TBasePlugin<TElementPluginEvents> {
	static readonly key = Symbol('element')

	private _element: HTMLElement | null = null
	private _readyResolve: ((element: HTMLElement) => void) | null = null

	get element(): HTMLElement | null {
		return this._element
	}

	set element(el: HTMLElement | null) {
		if (this._element === el) return

		const prev = this._element
		this._element = el

		if (el && !prev) {
			requestAnimationFrame(() => {
				if (this._element !== el) return

				this._readyResolve?.(el)
				this._readyResolve = null
				;(this.events as TEvented<TElementPluginEvents>).emit('ready', { element: el })
			})
		} else if (!el && prev) {
			;(this.events as TEvented<TElementPluginEvents>).emit('removed')
		}
	}

	/**
	 * Возвращает Promise, который резолвится когда элемент готов (в DOM после requestAnimationFrame).
	 * Если элемент уже установлен — резолвится немедленно.
	 */
	ready(): Promise<HTMLElement> {
		if (this._element) {
			return Promise.resolve(this._element)
		}

		return new Promise<HTMLElement>((resolve) => {
			this._readyResolve = resolve
		})
	}

	getContext() {
		return { element: this._element }
	}
}


// === ./soldy/packages\plugins\src\common\element\types.ts ===

export type TElementPluginEvents = {
	ready: (ctx: { element: HTMLElement }) => void
	removed: () => void
}


// === ./soldy/packages\plugins\src\common\instance\instance.plugin.ts ===

import { TBasePlugin } from '../../base'
import type { TInstancePluginEvents } from './types'
import { TEvented, type IComponent } from '@soldy/core'

export class TInstancePlugin<T extends IComponent = IComponent> extends TBasePlugin<
	TInstancePluginEvents<T>
> {
	static readonly key = Symbol('instance')

	private _instance: T | null = null
	private _readyResolve: ((instance: T) => void) | null = null

	get instance(): T | null {
		return this._instance
	}

	set instance(value: T | null) {
		if (this._instance === value) return

		this._instance = value

		if (value) {
			this._readyResolve?.(value)
			this._readyResolve = null
				; (this.events as TEvented<TInstancePluginEvents<T>>).emit('ready', { instance: value })
		} else {
			; (this.events as TEvented<TInstancePluginEvents<T>>).emit('removed')
		}
	}

	/**
	 * Возвращает Promise, который резолвится когда instance готов.
	 * Если instance уже установлен — резолвится немедленно.
	 */
	ready(): Promise<T> {
		if (this._instance) {
			return Promise.resolve(this._instance)
		}

		return new Promise<T>((resolve) => {
			this._readyResolve = resolve
		})
	}

	getContext() {
		return { instance: this._instance }
	}
}


// === ./soldy/packages\plugins\src\common\instance\types.ts ===

import type { IComponent } from '@soldy/core'

export type TInstancePluginEvents<T extends IComponent = IComponent> = {
	ready: (ctx: { instance: T }) => void
	removed: () => void
}


// === ./soldy/packages\plugins\src\common\icon\style.plugin.ts ===

import type { IIcon } from '@soldy/core'
import type { IPluginBundle } from '../../base/types'
import { TBasePlugin } from '../../base/plugin'
import { TInstancePlugin } from '../instance'
import type { TIconStylePluginEvents } from './types'

/**
 * Плагин для управления стилями иконки.
 */
export class TIconStylePlugin extends TBasePlugin<TIconStylePluginEvents> {
	static readonly key = Symbol('icon-style')

	protected _styles: Record<string, string | number> = {}

	override install(bundle: IPluginBundle): void {
		const instancePlugin = bundle.get(TInstancePlugin) as TInstancePlugin<IIcon> | undefined

		instancePlugin?.events.on('ready', ({ instance }) => {
			;(instance as unknown as IIcon).events.on('change:width', (value) => {
				this._styles['width'] =
					value! && (typeof value === 'number' || parseInt(value)) ? `${value}px` : ''
				;(this.events as any).emit('change:styles', this._styles)
			})
			;(instance as unknown as IIcon).events.on('change:height', (value) => {
				this._styles['height'] =
					value! && (typeof value === 'number' || parseInt(value)) ? `${value}px` : ''
				;(this.events as any).emit('change:styles', this._styles)
			})
		})
	}

	get styles(): Record<string, string | number> {
		return this._styles
	}
}


// === ./soldy/packages\plugins\src\common\icon\types.ts ===

export type TIconStylePluginEvents = {
    /** Вызывается при изменении набора стилей иконки */
    'change:styles': (styles: Record<string, string | number>) => void
}


