/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent, definePlugin } from '../../base'
import { TTabs, type ITabItem } from '@soldy/core'
import {
	TCollectionPlugin,
	TPlainExtension,
	TBatchExtension,
	TActivationExtension,
} from '@soldy/plugins'
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

import { TabsContribution, CollectionContribution, BatchExtensionContribution, ActivationExtensionContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'

export const TabsDescriptor = defineComponent({
	ctor: TTabs,

	extends: ControlDescriptor,

	contribution: TabsContribution,

	plugins: [
		definePlugin({
			ctor: TCollectionPlugin,
			contribution: [
				CollectionContribution,
				BatchExtensionContribution,
				ActivationExtensionContribution,
			],
			options: {
				extensions: {
					plain: TPlainExtension<ITabItem>,
					batch: TBatchExtension<ITabItem>,
					activation: TActivationExtension<ITabItem>,
				},
			},
		}),
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
