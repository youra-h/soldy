import type { IContribution } from '@soldy/accessor'
import { defineType } from './../../defineType'
import type { TListIndicator } from '@soldy/core'

/**
 * Коллекционные props владельца Select (выводятся `TSelectCollectionFacade`).
 *
 * `mode` служит переключателем множественного выбора: отдельного `multiple`
 * нет намеренно — два имени для одного состояния однажды разошлись бы.
 */
export const SelectCollectionContribution = (): IContribution => ({
	props: {
		mode: { type: String, triggers: ['change:mode'] },
		selected: { type: Array, protected: true, triggers: ['change:selection'] },
		/**
		 * Текст выбранного — то, что поле показывает вместо `placeholder`.
		 * Здесь, а не в собственной contribution: складывается из опций, а о
		 * них знает коллекция. `change:tags` — текст обнуляется, как только
		 * появляются теги, даже если сам выбор при этом не менялся.
		 */
		valueText: { type: String, protected: true, triggers: ['change:valueText', 'change:tags'] },
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
		/**
		 * Плейсхолдер поля с поправкой на теги: пока они есть, родной
		 * `placeholder` инпута проступил бы сквозь них — его `value`
		 * (`valueText`) в режиме тегов тоже пуст.
		 */
		field_placeholder: {
			type: String,
			protected: true,
			triggers: ['change:tags', 'change:placeholder'],
		},
	},
})

/**
 * Item-level props опции (выводятся `TSelectItemCollectionFacade`).
 */
export const SelectCollectionItemContribution = (): IContribution => ({
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
})
