import { TBasePlugin } from '../../../base'
import type { IPlugin, IPluginBundle, IPluginConstructor } from '../../../base'
import type { TCollectionItemPluginsEvents } from './types'

/**
 * Единый регистратор плагинов элементов коллекции.
 *
 * Накапливает item-бандлы по uid. Любой плагин может получить
 * плагин конкретного item'а через getPlugin(uid, PluginClass).
 */
export class TCollectionItemPlugins extends TBasePlugin<any, TCollectionItemPluginsEvents> {
	private readonly _bundles = new Map<string | number, IPluginBundle>()

	register(uid: string | number, bundle: IPluginBundle, instance: unknown): void {
		this._bundles.set(uid, bundle)

		const ctx = {
			get: bundle.get.bind(bundle),
			getInstance: <T>() => instance as T | null,
		}

		this.events.emit('item:registered', { uid, ctx })
	}

	unregister(uid: string | number): void {
		this._bundles.delete(uid)
		this.events.emit('item:unregistered', { uid })
	}
}
