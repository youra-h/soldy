/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет orientation, alignment, position, view, closable + плагины.
 */

import { defineComponent, definePlugin } from '../../base'
import { TTabs } from '@soldy/core'
import { TTabsLayoutPlugin, TTabsActiveTabPlugin, TTabsViewPlugin, TDragPlugin } from '@soldy/plugins'
import { TabsContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'

export const TabsDescriptor = defineComponent({
	ctor: TTabs,

	extends: ControlDescriptor,

	contribution: TabsContribution,

	plugins: [
		definePlugin({
			ctor: TTabsLayoutPlugin,
		}),
		definePlugin({
			ctor: TTabsActiveTabPlugin,
		}),
		definePlugin({
			ctor: TTabsViewPlugin,
		}),
		definePlugin({
			ctor: TDragPlugin,
		}),
	],
})
