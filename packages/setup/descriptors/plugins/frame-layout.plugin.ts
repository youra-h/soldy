import { definePlugin } from '../base'
import { TFrameLayoutPlugin } from '@soldy/plugins'
import { FrameLayoutContribution } from '../../contributions'

export const FrameLayoutPluginDescriptor = () =>
	definePlugin({
		ctor: TFrameLayoutPlugin,
		namespace: 'layout',
		contribution: FrameLayoutContribution(),
	})
