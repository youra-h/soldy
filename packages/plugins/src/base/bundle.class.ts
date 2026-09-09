import type { IPlugin, IPluginBundle, IPluginConstructor } from './types'

export class TPluginBundle implements IPluginBundle {
	private _plugins = new Map<IPluginConstructor<any, any, any>, IPlugin<any, any>>()

	constructor(private readonly _instance: any) {}

	/** Компонент, которому принадлежит набор. */
	getInstance<T>(): T | null {
		return (this._instance ?? null) as T | null
	}

	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: Record<string, any>,
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
			},
			options,
		)

		return this
	}

	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined {
		return this._plugins.get(ctor) as P | undefined
	}

	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void {
		const plugin = this._plugins.get(PluginCtor)

		plugin?.destroy()

		this._plugins.delete(PluginCtor)
	}
}
