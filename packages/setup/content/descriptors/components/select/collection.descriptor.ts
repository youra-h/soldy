/**
 * Дескрипторы коллекционной части Select — фасады владельца и опции.
 *
 * Членство в коллекции отделено от собственных пропсов компонента
 * (`SelectDescriptor`, `SelectItemDescriptor`): адаптер собирает компонент из
 * обоих рантайм-списков.
 */

import { defineComponent, defineDescriptor } from '../../../../protected/define'
import { TSelectCollectionFacade, TSelectItemCollectionFacade } from '@soldy-ui/core'
import { CollectionDescriptor } from '../collection'
import { GROUP_PROPS } from '../list'

export const SelectCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props владельца Select (выводятся `TSelectCollectionFacade`):
		 * режим выбора, сам выбор, группы опций (общий фрагмент `GROUP_PROPS`, как
		 * у Menu и ListBox), теги поля и что рисует список панели.
		 *
		 * `mode` служит переключателем множественного выбора: отдельного `multiple`
		 * нет намеренно — два имени для одного состояния однажды разошлись бы.
		 */
		contribution: {
			props: {
				mode: { type: String, triggers: ['change:mode'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
				...GROUP_PROPS,
				/**
				 * Инстанс тегов при множественном выборе, `null` иначе. Живёт в
				 * `TSelectTagsExtension` — второй компонент со своей коллекцией, а не
				 * разметка: связку «опция ⇄ тег» пришлось бы иначе повторять в шести
				 * адаптерах.
				 */
				tags: { type: Object, protected: true, triggers: ['change:tags'] },
				/** Коллекция тегов — то, что `<Tags :engine="...">` берёт готовым. */
				tags_engine: { type: Object, protected: true, triggers: ['change:tags'] },
				/**
				 * Что делать с тегами, которым не хватило строки поля. Передаётся
				 * своему `TTags` так же, как `size` и `variant`; по умолчанию
				 * `wrap` — поведение поля не меняется, пока режим не задали.
				 */
				tags_overflow: { type: String, triggers: ['change:overflow'] },
				/**
				 * Что рисует список панели, по секциям: группа с подписью или опции
				 * без группы, а в секции — опции на своих местах и, в окне обёртки
				 * `Virtual`, распорки на месте пропущенных. Между соседними
				 * секциями разметка рисует разделитель. Без групп секция одна
				 */
				drawnSections: {
					type: Array,
					protected: true,
					triggers: ['change:drawnSections'],
				},
			},
		},
	}),
)

/**
 * Без `extends`: это чистое членство в коллекции — выбранность и порядок.
 * Собственные пропсы опции приходят из SelectItemDescriptor.
 */
export const SelectCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectItemCollectionFacade,
		/**
		 * Item-level props опции (выводятся `TSelectItemCollectionFacade`).
		 */
		contribution: {
			props: {
				selected: { type: Boolean, triggers: ['change:selected'] },
				order: { type: Number, protected: true, triggers: ['change:order'] },
				/**
				 * Сторона отметки выбранного. Только на чтение: значение одно на весь
				 * список и живёт на поле — как `view` у элемента ListBox.
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
