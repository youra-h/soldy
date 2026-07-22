import { TPluginBundle, type IPluginBundle } from '../base'
import { TElementPlugin } from '../common/element'
import { TInstancePlugin } from '../common/instance'
import { TReadyPlugin } from '../common/ready'

export function createComponentViewBundle(): IPluginBundle {
	return new TPluginBundle().use(TElementPlugin).use(TInstancePlugin).use(TReadyPlugin)
}
