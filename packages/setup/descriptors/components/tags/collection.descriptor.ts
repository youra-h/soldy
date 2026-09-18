import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TTagsCollectionFacade, TTagsItemCollectionFacade } from '@soldy/core'
import type { TButtonView } from '@soldy/core'
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
				/**
				 * Внешний вид тега — со набора целиком, только на чтение (как `view` у
				 * ListBox): меняется на инстансе Tags, а не на теге.
				 */
				view: {
					type: defineType<TButtonView>(String),
					protected: true,
					triggers: ['change:view'],
				},
			},
		},
	}),
)
