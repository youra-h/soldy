import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TSelectCollectionFacade, TSelectItemCollectionFacade } from '@soldy/core'
import { CollectionDescriptor } from '../collection'
import type { TListIndicator } from '@soldy/core'

export const SelectCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSelectCollectionFacade,

		extends: CollectionDescriptor(),

		/**
		 * Коллекционные props владельца Select (выводятся `TSelectCollectionFacade`).
		 *
		 * `mode` служит переключателем множественного выбора: отдельного `multiple`
		 * нет намеренно — два имени для одного состояния однажды разошлись бы.
		 */
		contribution: {
			props: {
				mode: { type: String, triggers: ['change:mode'] },
				selected: { type: Array, protected: true, triggers: ['change:selection'] },
				/**
				 * `role`, `id` и множественность списка. Проп, а не набор `aria`: у
				 * списка нет своего компонента — это разметка внутри шаблона Select,
				 * писать некуда. Та же асимметрия, что у панели Accordion.
				 */
				list_aria: { type: Object, protected: true, triggers: ['change:mode'] },
				/**
				 * Инстанс тегов при множественном выборе, `null` иначе. Живёт в
				 * `TSelectTagsExtension` — второй компонент со своей коллекцией, а не
				 * разметка: связку «опция ⇄ тег» пришлось бы иначе повторять в шести
				 * адаптерах.
				 */
				tags: { type: Object, protected: true, triggers: ['change:tags'] },
				/** Коллекция тегов — то, что `<Tags :engine="...">` берёт готовым. */
				tags_engine: { type: Object, protected: true, triggers: ['change:tags'] },
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
					type: defineType<TListIndicator>(String),
					protected: true,
					triggers: ['change:indicator'],
				},
			},
		},
	}),
)
