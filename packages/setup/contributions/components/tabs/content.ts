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
 * активность — свойство членства в коллекции, а не панели.
 *
 * ARIA-связки здесь нет: `role`, `id` и `aria-labelledby` пишет прямо в
 * `aria` панели `TTabsContentBindingExtension` — то единственное место, где
 * известно, что панель и таб нашли друг друга.
 */
export const TabsCollectionContentContribution = (): IContribution => ({
	props: {
		active: { type: Boolean, protected: true, triggers: ['change:active'] },
	},
})
