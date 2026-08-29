import { definePlugin } from '../base'
import { TSpinnerLayoutPlugin } from '@soldy/plugins'
import { SpinnerLayoutContribution } from '../../contributions'

export const SpinnerLayoutPluginDescriptor = () =>
	definePlugin({
		ctor: TSpinnerLayoutPlugin,
		namespace: 'layout',
		contribution: SpinnerLayoutContribution(),
	})
