/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * @deprecated composition: ActivatableCollectionDescriptor — коллекция теперь управляется плагином TTabsCollectionPlugin
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent, definePlugin } from '../../base'
import { TTabs } from '@soldy/core'
// import {
//     TTabsLayoutPlugin,
//     TTabsActiveTabPlugin,
//     TTabsViewPlugin,
//     TDragPlugin,
//     TTabsCollectionPlugin,
//     TCollectionItemPlugins,
//     TElementAccumulationPlugin,
//     TInstanceAccumulationPlugin,
// } from '@soldy/plugins'
import { TabsContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'

export const TabsDescriptor = defineComponent({
	ctor: TTabs,

	extends: ControlDescriptor,

	contribution: TabsContribution,

	plugins: [
		// // Коллекция и накопление
		// definePlugin({ ctor: TTabsCollectionPlugin }),
		// definePlugin({ ctor: TCollectionItemPlugins }),
		// definePlugin({ ctor: TElementAccumulationPlugin }),
		// definePlugin({ ctor: TInstanceAccumulationPlugin }),
		// // Tabs-специфичные
		// definePlugin({ ctor: TTabsLayoutPlugin }),
		// definePlugin({ ctor: TTabsActiveTabPlugin }),
		// definePlugin({ ctor: TTabsViewPlugin }),
		// definePlugin({ ctor: TDragPlugin }),
	],
})
