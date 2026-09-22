/**
 * Дескрипторы коллекционной части Tabs — фасады владельца и таба.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`TabsDescriptor`, `TabsItemDescriptor`): адаптер собирает компонент из обоих
 * рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TTabsCollectionFacade, TTabsItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'

export const TabsCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца Tabs (выводятся фасадом TTabsCollectionFacade).
		 */
		contribution: {
			props: {
				activeItem: { type: Object, protected: true, triggers: ['change:activation'] },
			},
			events: ['item:activated', 'item:deactivated', 'item:close'],
		},
	}),
)

export const TabsCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsItemCollectionFacade,
		/**
		 * Item-level пропсы элемента Tabs (выводятся фасадом TTabsItemCollectionFacade).
		 */
		contribution: {
			props: {
				active: { type: Boolean, triggers: ['change:active'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
				tab_closable: {
					type: Boolean,
					protected: true,
					get: (item: TTabsItemCollectionFacade) => item.closable,
					triggers: ['change:closable'],
				},
			},
		},
	}),
)
