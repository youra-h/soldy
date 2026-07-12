import type { IPluginBundle } from '../../base/types'

export type {
	TElementAccumulationEvents as TCollectionElementsPluginEvents,
	TInstanceAccumulationEvents as TCollectionInstancesPluginEvents,
	TElementAccumulationEvents,
	TInstanceAccumulationEvents,
} from './accumulation/types'

export type TCollectionItemPluginsEvents = {
	itemRegistered: (payload: { uid: string | number; bundle: IPluginBundle }) => void
	itemUnregistered: (payload: { uid: string | number }) => void
}
