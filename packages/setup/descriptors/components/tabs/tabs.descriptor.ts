/**
 * Дескриптор Tabs (TTabs).
 *
 * Множественное наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 * - ActivatableCollectionDescriptor (items, activeItem, events: item:activated/item:deactivated/...)
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent, definePlugin } from '../../base'
import { TTabs } from '@soldy/core'
import { TTabsLayoutPlugin, TTabsActiveTabPlugin, TTabsViewPlugin, TDragPlugin } from '@soldy/plugins'
import { TabsContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import { ActivatableCollectionDescriptor } from '../collection'

export const TabsDescriptor = defineComponent({
	ctor: TTabs,

	extends: [ControlDescriptor, ActivatableCollectionDescriptor],

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
