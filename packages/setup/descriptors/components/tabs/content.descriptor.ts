/**
 * Дескрипторы панели таба (`TabsContent`).
 *
 * Две штуки — как у элемента: собственный (props панели) и коллекционный
 * (активность и ARIA-связка, выводятся фасадом). Смешивать нельзя: core
 * отвечает за props и events, коллекционная часть — за членство в коллекции.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TTabsContent, TTabsContentCollectionFacade } from '@soldy/core'
import { ComponentViewDescriptor } from '../component-view.descriptor'
import { TabsContentWarnPluginDescriptor } from '../../plugins'

export const TabsContentDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsContent,

		extends: ComponentViewDescriptor(),

		/** Собственные props панели (выводятся классом TTabsContent). */
		contribution: {
			props: {
				value: { type: [String, Number], triggers: ['change:value'] },
			},
			slots: {
				default: { description: 'Содержимое панели' },
			},
		},

		plugins: [TabsContentWarnPluginDescriptor()],
	}),
)

export const TabsCollectionContentDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsContentCollectionFacade,

		/**
		 * Коллекционные props панели (выводятся фасадом TTabsContentCollectionFacade).
		 *
		 * Отделены от собственных ровно как у элемента (`TabsCollectionItemDescriptor`):
		 * активность — свойство членства в коллекции, а не панели.
		 *
		 * ARIA-связки здесь нет: `role`, `id`, `aria-labelledby` и `tabindex` пишет
		 * прямо в `aria` панели `TTabsContentBindingExtension` — то единственное
		 * место, где известно, что панель и таб нашли друг друга.
		 */
		contribution: {
			props: {
				active: { type: Boolean, protected: true, triggers: ['change:active'] },
			},
		},
	}),
)
