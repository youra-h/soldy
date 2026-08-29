/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent } from '../../base'
import { TTabs } from '@soldy/core'

import { TabsContribution } from '../../../contributions'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	TabsActiveTabPluginDescriptor,
	TabsLayoutPluginDescriptor,
	TabsViewPluginDescriptor,
} from '../../plugins'

export const TabsDescriptor = () =>
	defineComponent({
		ctor: TTabs,

		extends: ControlDescriptor(),

		contribution: TabsContribution(),

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Tabs-специфичные
			TabsLayoutPluginDescriptor(),
			TabsActiveTabPluginDescriptor(),
			TabsViewPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	})
