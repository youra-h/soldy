import type { IContribution } from '@soldy/accessor'

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
		 * них знает коллекция.
		 */
		valueText: { type: String, protected: true, triggers: ['change:valueText'] },
		/**
		 * `role`, `id` и множественность списка. Проп, а не набор `aria`: у
		 * списка нет своего компонента — это разметка внутри шаблона Select,
		 * писать некуда. Та же асимметрия, что у панели Accordion.
		 */
		list_aria: { type: Object, protected: true, triggers: ['change:mode'] },
	},
})

/**
 * Item-level props опции (выводятся `TSelectItemCollectionFacade`).
 */
export const SelectCollectionItemContribution = (): IContribution => ({
	props: {
		selected: { type: Boolean, triggers: ['change:selected'] },
		order: { type: Number, protected: true, triggers: ['change:order'] },
	},
})
