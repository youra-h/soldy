/**
 * Дескриптор Tabs (TTabs).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: orientation, alignment, position, view, closable + плагины Tabs.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TTabs } from '@soldy/core'
import type { ITabsItem } from '@soldy/core'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	TabsActiveTabPluginDescriptor,
	TabsKeyboardPluginDescriptor,
	TabsLayoutPluginDescriptor,
} from '../../plugins'

export const TabsDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabs,

		extends: ControlDescriptor(),

		contribution: {
			/**
			 * `content` отделён от `default` не по вкусу, а структурно: `default`
			 * кладётся внутрь `[role=tablist]`, и панель, попав туда, оказалась бы в
			 * списке табов. Раньше панели уходили в динамический слот
			 * `panel:${value}`, который резолвил только Vue; теперь это статический
			 * слот с компонентами `TabsContent`.
			 */
			slots: {
				leading: { description: 'Перед списком табов' },
				default: { description: 'Табы — элементы коллекции' },
				trailing: { description: 'После списка табов' },
				content: { description: 'Панели табов — компоненты TabsContent' },
				item: {
					scope: { item: defineType<ITabsItem>(Object) },
					description: 'Содержимое таба при работе через проп items',
				},
				'item-leading': {
					scope: { item: defineType<ITabsItem>(Object) },
					description: 'Перед содержимым таба',
				},
				'item-trailing': {
					scope: { item: defineType<ITabsItem>(Object) },
					description: 'После содержимого таба',
				},
			},
			props: {
				orientation: { type: String, triggers: ['change:orientation'] },
				alignment: { type: String, triggers: ['change:alignment'] },
				position: { type: String, triggers: ['change:position'] },
				view: { type: String, triggers: ['change:view'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
			},
			// events: [
			// 	'item:close',
			// 	'item:closable',
			// 	'item:disabled',
			// 	'item:text',
			// 	'item:rendered',
			// 	'item:visible',
			// 	'item:present',
			// ],
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
			// Tabs-специфичные
			TabsLayoutPluginDescriptor(),
			TabsActiveTabPluginDescriptor(),
			// Клавиатура по APG Tabs: стрелки, Home/End, Delete
			TabsKeyboardPluginDescriptor(),
			// Drag-and-drop
			DragPluginDescriptor(),
		],
	}),
)
