import type { TCollection } from '@soldy/core'
import type { IPluginBundle } from '../../base'

/** События реестра bundles элементов коллекции. */
export type TBundlesEvents = {
	/** Коллекция привязана к реестру (вызывается bindCollection). */
	'collection:bound': (collection: TCollection<any, any>) => void
	'bundle:registered': (payload: {
		uid: string | number
		bundle: IPluginBundle
	}) => void
	'bundle:unregistered': (payload: { uid: string | number }) => void
}
