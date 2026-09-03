import { definePlugin } from '../base'
import { TIconLayoutPlugin } from '@soldy/plugins'
import type { TIconLayoutPluginEvents } from '@soldy/plugins'
import { IconLayoutContribution } from '../../contributions'

export const IconLayoutPluginDescriptor = () =>
	definePlugin<'layout', TIconLayoutPluginEvents>({
		ctor: TIconLayoutPlugin,
		namespace: 'layout',
		contribution: IconLayoutContribution(),
	})
