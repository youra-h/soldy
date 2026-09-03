import { definePlugin } from '../base'
import { TSpinnerLayoutPlugin } from '@soldy/plugins'
import type { TSpinnerLayoutPluginEvents } from '@soldy/plugins'
import { SpinnerLayoutContribution } from '../../contributions'

export const SpinnerLayoutPluginDescriptor = () =>
	definePlugin<'layout', TSpinnerLayoutPluginEvents>({
		ctor: TSpinnerLayoutPlugin,
		namespace: 'layout',
		contribution: SpinnerLayoutContribution(),
	})
