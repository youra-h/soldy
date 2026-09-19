/**
 * Дескрипторы коллекционной части Tags — фасады владельца и тега.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`TagsDescriptor`, `TagsItemDescriptor`): адаптер собирает компонент из обоих
 * рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TTagsCollectionFacade, TTagsItemCollectionFacade } from '@soldy/core'
import { CollectionDescriptor } from '../collection'

export const TagsCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTagsCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца Tags — то, что выводит фасад
		 * `TTagsCollectionFacade`: режим выбора и сам выбор (как у ListBox). Дефолт
		 * `mode` — `none`, задаётся в `TagsFactory`, здесь только контракт.
		 */
		contribution: {
			props: {
				mode: { type: String, triggers: ['change:mode'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
			},
			events: [],
		},
	}),
)

export const TagsCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTagsItemCollectionFacade,

		/**
		 * Item-level пропсы элемента Tags — то, что выводит фасад
		 * `TTagsItemCollectionFacade`.
		 */
		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
				tag_closable: {
					type: Boolean,
					protected: true,
					get: (item: TTagsItemCollectionFacade) => item.closable,
					triggers: ['change:closable'],
				},
			},
		},
	}),
)
