/**
 * Дескрипторы коллекционной части ListBox — фасады владельца и элемента.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`ListBoxDescriptor`, `ListBoxItemDescriptor`): адаптер собирает компонент из
 * обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TListBoxCollectionFacade, TListBoxItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'
import { GROUP_PROPS } from '../list'

export const ListBoxCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props/events владельца ListBox — то, что выводит фасад
		 * `TListBoxCollectionFacade`: режим выбора, сам выбор, группы элементов
		 * (общий фрагмент `GROUP_PROPS`, как у Menu и Select) и что рисует
		 * список.
		 */
		contribution: {
			props: {
				mode: { type: String, triggers: ['change:mode'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
				...GROUP_PROPS,
				/**
				 * Что рисует список, по секциям: группа с подписью или элементы без
				 * группы, а в секции — элементы на своих местах и, в окне обёртки
				 * `Virtual`, распорки на месте пропущенных. Между соседними
				 * секциями разметка рисует разделитель. Без групп секция одна
				 */
				drawnSections: {
					type: Array,
					protected: true,
					triggers: ['change:drawnSections'],
				},
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
