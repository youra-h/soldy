/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent } from '../../base'
import { TTabs, type ITabItem } from '@soldy/core'
// import {
//     TTabsLayoutPlugin,
//     TTabsActiveTabPlugin,
//     TTabsViewPlugin,
//     TDragPlugin,
// } from '@soldy/plugins'

import {
	TabsContribution,
	CollectionContribution,
	BatchExtensionContribution,
	ActivationExtensionContribution,
	OrderExtensionContribution,
} from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
} from '../../plugins'

export const TabsDescriptor = defineComponent({
	ctor: TTabs,

	extends: ControlDescriptor,

	contribution: TabsContribution,

	plugins: [
		// Коллекция: реестр bundles + доступ к DOM-элементам
		CollectionBundlesPluginDescriptor,
		CollectionElementsPluginDescriptor,
		// // Tabs-специфичные
		// definePlugin({ ctor: TTabsLayoutPlugin }),
		// definePlugin({ ctor: TTabsActiveTabPlugin }),
		// definePlugin({ ctor: TTabsViewPlugin }),
		// definePlugin({ ctor: TDragPlugin }),
	],
})
