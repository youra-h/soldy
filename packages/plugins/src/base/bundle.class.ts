import type { IPlugin, IPluginBundle, IPluginConstructor } from './types'

export class TPluginBundle implements IPluginBundle {
	private _plugins = new Map<symbol, IPlugin<any, any>>()

	use<P extends IPlugin<any, any>>(
		PluginCtor: IPluginConstructor<any, any, P>,
		options?: Record<string, any>,
	): this {
		const plugin = new PluginCtor(this, options)
		// Добавляем плагин в коллекцию, используя его namespace в качестве ключа
		this._plugins.set(PluginCtor.namespace, plugin)

		plugin.install({ instance: options?.instance ?? null })

		return this
	}

	get<P extends IPlugin<any, any>>(ctor: IPluginConstructor<any, any, P>): P | undefined
	get(namespace: symbol): IPlugin | undefined
	get<P extends IPlugin<any, any>>(
		ctorOrNamespace: IPluginConstructor<any, any, P> | symbol,
	): P | IPlugin | undefined {
		const key = typeof ctorOrNamespace === 'symbol' ? ctorOrNamespace : ctorOrNamespace.namespace

		return this._plugins.get(key) as P | undefined
	}

	remove<P extends IPlugin<any, any>>(PluginCtor: IPluginConstructor<any, any, P>): void {
		const plugin = this._plugins.get(PluginCtor.namespace)

		plugin?.destroy()

		this._plugins.delete(PluginCtor.namespace)
	}
}
