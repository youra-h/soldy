import { TPluginBundle, type IPluginBundle } from '../base'
import { TElementPlugin } from '../common/element'
import { TInstancePlugin } from '../common/instance'
import { TReadyPlugin } from '../common/ready'
import { TFrameStylePlugin } from '../common/frame'

export function createFrameBundle(): IPluginBundle {
	return new TPluginBundle()
		.use(TElementPlugin)
		.use(TInstancePlugin)
		.use(TReadyPlugin)
		.use(TFrameStylePlugin)
}
