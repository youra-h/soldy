/**
 * Дескрипторы коллекционной части ListBox — фасады владельца и элемента.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`ListBoxDescriptor`, `ListBoxItemDescriptor`): адаптер собирает компонент из
 * обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TListBoxCollectionFacade, TListBoxItemCollectionFacade } from '@soldy/core'
import { CollectionDescriptor } from '../collection'

export const ListBoxCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца ListBox — то, что выводит фасад
		 * `TListBoxCollectionFacade`: режим выбора и сам выбор.
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

export const ListBoxCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxItemCollectionFacade,

		/**
		 * Item-level пропсы элемента ListBox — то, что выводит фасад
		 * `TListBoxItemCollectionFacade`.
		 *
		 * `list_wordWrap` отсюда ушёл: разрешение «значение элемента поверх значения
		 * списка» больше не проходит через фасад — `data-content-fit` элементам ставит
		 * `TListBoxExtension`, у которого на руках и элемент, и владелец.
		 */
		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
				view: {
					type: String,
					protected: true,
					triggers: ['change:view'],
				},
				/**
				 * Сторона отметки выбранного. Только на чтение, как `view`: значение
				 * одно на весь список и меняется на его инстансе.
				 */
				indicator: {
					type: String,
					protected: true,
					triggers: ['change:indicator'],
				},
			},
		},
	}),
)
