import { TEvented } from '@soldy-ui/core'
import type { IPlugin, IPluginBundle, IPluginConstructor, TPluginBundleEvents } from './types'

/** Наборов без id монтирования от адаптера: номер такого монтирования в процессе. */
let unnamedMounts = 0

export class TPluginBundle implements IPluginBundle {
	readonly events = new TEvented<TPluginBundleEvents>()

	private _plugins = new Map<IPluginConstructor<any, any, any>, IPlugin<any, any>>()
	/** Набор принят (`attach()`): плагин, поставленный позже, принимается сразу. */
	private _attached = false
	/** Набор объявлен наружу (`created()`): плагин, поставленный позже, объявляется сразу. */
	private _created = false
	/** Набор уничтожен (`destroy()`): объявлять его наружу больше нельзя. */
	private _destroyed = false
	/** Id монтирования, которому принадлежит набор (`createId`). */
	private readonly _mountId: string

	constructor(
		private readonly _instance: object,
		mountId?: string,
	) {
		this._mountId = mountId || `s-${++unnamedMounts}`
	}

	get destroyed(): boolean {
		return this._destroyed
	}

	/** Компонент, которому принадлежит набор. */
	getInstance<T>(): T | null {
		return (this._instance ?? null) as T | null
	}

	createId(part: string): string {
		return `${this._mountId}-${part}`
	}

	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: object,
	): this {
		const plugin = new PluginCtor()
		this._plugins.set(PluginCtor, plugin)

		// Контекст плагина — срез бандла, а не отдельная реализация: оба метода
		// отдаются связанными. Раньше `getInstance` был здесь самостоятельным
		// замыканием, и наружу тот же `_instance` выходил вторым способом —
		// геттером `instance`, да ещё и как `unknown`, то есть с кастом на
		// каждом использовании.
		plugin.install(
			{
				get: this.get.bind(this),
				getInstance: this.getInstance.bind(this),
				createId: this.createId.bind(this),
			},
			options,
		)

		// Набор уже принят и объявлен — принять и объявить этот плагин больше
		// некому. Так плагин, поставленный снаружи (из `bundle:create` или
		// позже), живёт по тому же циклу, что и плагины дескриптора.
		if (this._attached) plugin.attach()
		if (this._created) plugin.created()

		this.events.emit('use', PluginCtor, plugin)

		return this
	}

	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined {
		return this._plugins.get(ctor) as P | undefined
	}

	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void {
		const plugin = this._plugins.get(PluginCtor)

		if (!plugin) return

		this.events.emit('remove', PluginCtor, plugin)
		plugin.destroy()

		this._plugins.delete(PluginCtor)
	}

	attach(): void {
		// Уничтоженный набор не принимается: подписки его плагинов снять уже
		// некому
		if (this._attached || this._destroyed) return

		this._attached = true

		for (const plugin of [...this._plugins.values()]) plugin.attach()
	}

	created(): void {
		// Уничтоженный набор не объявляется: плагин, поставленный в него после
		// destroy(), остался бы жить — уничтожать его уже некому
		if (this._created || this._destroyed) return

		this._created = true

		for (const plugin of [...this._plugins.values()]) plugin.created()
	}

	destroy(): void {
		this._destroyed = true
		// Плагин, поставленный в уничтоженный набор, не принимается и не
		// объявляется: снять его подписки и уничтожить его уже некому
		this._attached = false
		this._created = false

		// Обратный порядок: плагин ставится после тех, от кого зависит, и
		// уничтожается раньше них
		for (const plugin of [...this._plugins.values()].reverse()) plugin.destroy()

		this._plugins.clear()
	}
}
