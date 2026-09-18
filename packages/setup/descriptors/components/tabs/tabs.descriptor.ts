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
import type { ITabsProps, TTabsEvents, ITabsItem } from '@soldy/core'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	TabsActiveTabPluginDescriptor,
	TabsKeyboardPluginDescriptor,
	TabsLayoutPluginDescriptor,
} from '../../plugins'
import type { TEmptySlotScope } from '../../../define'

/**
 * Слоты Tabs.
 *
 * `content` отделён от `default` не по вкусу, а структурно: `default` кладётся
 * внутрь `[role=tablist]`, и панель, попав туда, оказалась бы в списке табов.
 * Раньше панели уходили в динамический слот `panel:${value}`, который резолвил
 * только Vue; теперь это статический слот с компонентами `TabsContent`.
 */
export type TTabsSlots = {
	leading: TEmptySlotScope
	default: TEmptySlotScope
	trailing: TEmptySlotScope
	content: TEmptySlotScope
}

export const TabsDescriptor = defineDescriptor(() =>
	defineComponent<ITabsProps, TTabsEvents, TTabsSlots>()({
		ctor: TTabs,

		extends: ControlDescriptor(),

		contribution: {
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
