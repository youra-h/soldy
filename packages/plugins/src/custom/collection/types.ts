import type { TCollectionEngine } from '@soldy-ui/core'
import type { IPluginBundle, TPluginEvents } from '../../base'

/** События реестра bundles элементов коллекции. */
export type TBundlesEvents = TPluginEvents & {
	/** Коллекция привязана к реестру (вызывается bindEngine). */
	'engine:bound': (engine: TCollectionEngine<any, any>) => void
	'bundle:registered': (payload: { uid: string | number; bundle: IPluginBundle }) => void
	'bundle:unregistered': (payload: { uid: string | number }) => void
}
