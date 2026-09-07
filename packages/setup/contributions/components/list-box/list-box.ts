import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { IListBoxItem } from '@soldy/core'

/**
 * Слоты ListBox.
 *
 * Панели у списка нет: выбор элемента не раскрывает содержимое, поэтому части
 * `Content` здесь не существует — в отличие от Tabs и от слота `item-content`
 * у Collapse.
 *
 * Слоты элементов статические и получают элемент через scope (см. Collapse).
 */
export type TListBoxSlots = {
	default: {}
	header: {}
	footer: {}
	item: { item: IListBoxItem }
	'item-leading': { item: IListBoxItem }
	'item-trailing': { item: IListBoxItem }
}

export const ListBoxContribution = (): IContribution => ({
	slots: {
		default: { description: 'Элементы коллекции' },
		header: { description: 'Над списком' },
		footer: { description: 'Под списком' },
		item: {
			scope: { item: defineType<IListBoxItem>(Object) },
			description: 'Содержимое элемента при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<IListBoxItem>(Object) },
			description: 'Перед содержимым элемента',
		},
		'item-trailing': {
			scope: { item: defineType<IListBoxItem>(Object) },
			description: 'После содержимого элемента',
		},
	},
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
