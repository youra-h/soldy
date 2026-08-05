import type { IComponentView } from '@soldy/core'
import type { IPluginContext } from '../../../base'

/** События регистратора плагинов элементов коллекции */
export type TCollectionItemPluginsEvents = {
	'item:registered': (payload: { uid: string | number; ctx: IPluginContext }) => void
	'item:unregistered': (payload: { uid: string | number }) => void
}

/** События плагина накопления DOM-элементов */
export type TElementAccumulationEvents = {
	'element:added': (payload: { uid: string | number; element: HTMLElement }) => void
	'element:removed': (payload: { uid: string | number }) => void
	'element:present': (payload: { uid: string | number; present: boolean }) => void
}

/** События плагина накопления инстансов */
export type TInstanceAccumulationEvents = {
	'instance:added': (payload: { uid: string | number; instance: IComponentView }) => void
	'instance:removed': (payload: { uid: string | number }) => void
}
