/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Композиция:
 * - ActivatableCollectionDescriptor → collection:* (items, activeItem, events)
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

	extends: ControlDescriptor,

	contribution: TabsContribution,

	composition: [{
		descriptor: ActivatableCollectionDescriptor,
		get: (instance) => instance.collection,
	}],

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
