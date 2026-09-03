import { definePlugin } from '../base'
import { TFrameLayoutPlugin } from '@soldy/plugins'
import type { TFrameLayoutPluginEvents } from '@soldy/plugins'
import { FrameLayoutContribution } from '../../contributions'

export const FrameLayoutPluginDescriptor = () =>
	definePlugin<'layout', TFrameLayoutPluginEvents>({
		ctor: TFrameLayoutPlugin,
		namespace: 'layout',
		contribution: FrameLayoutContribution(),
	})
