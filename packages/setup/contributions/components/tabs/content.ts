import type { IContribution } from '@soldy/accessor'

/**
 * Панель таба. Слот один — содержимое; частей у неё нет.
 */
export type TTabsContentSlots = {
	default: {}
}

/** Собственные props панели (выводятся классом TTabsContent). */
export const TabsContentContribution = (): IContribution => ({
	props: {
		value: { type: [String, Number], triggers: ['change:value'] },
	},
	slots: {
		default: { description: 'Содержимое панели' },
	},
})

/**
 * Коллекционные props панели (выводятся фасадом TTabsContentCollectionFacade).
 *
 * Отделены от собственных ровно как у элемента (`TabsCollectionItemContribution`):
 * активность и ARIA-связка — свойства членства в коллекции, а не панели.
 */
export const TabsCollectionContentContribution = (): IContribution => ({
	props: {
		active: { type: Boolean, protected: true, triggers: ['change:active'] },
		/**
		 * `role`, `id`, `aria-labelledby`. Здесь, а не в собственной
		 * contribution: id связки берётся у связанного таба, то есть это знание
		 * коллекции.
		 */
		content_aria: {
			type: Object,
			protected: true,
			triggers: ['change:active'],
		},
	},
})
