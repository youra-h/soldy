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
