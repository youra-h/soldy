import type { IPlugin, IPluginBundle, IPluginConstructor } from './types'

export class TPluginBundle implements IPluginBundle {
	private _plugins = new Map<IPluginConstructor<any, any, any>, IPlugin<any, any>>()

	constructor(private readonly _instance: any) {}

	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: Record<string, any>,
	): this {
		const plugin = new PluginCtor()
		this._plugins.set(PluginCtor, plugin)

		plugin.install(
			{
				get: this.get.bind(this),
				getInstance: <T>() => this._instance as T | null,
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
