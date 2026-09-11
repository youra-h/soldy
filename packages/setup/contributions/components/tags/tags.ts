import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { ITagsItem } from '@soldy/core'

/**
 * Слоты Tags.
 *
 * Tags — не список: заголовка/подвала ListBox здесь нет, потому что у задачи
 * нет потребителя для них. Слоты элементов статические и получают элемент
 * через scope (см. ListBox).
 */
export type TTagsSlots = {
	default: {}
	item: { item: ITagsItem }
	'item-leading': { item: ITagsItem }
	'item-trailing': { item: ITagsItem }
}

export const TagsContribution = (): IContribution => ({
	slots: {
		default: { description: 'Теги — элементы коллекции' },
		item: {
			scope: { item: defineType<ITagsItem>(Object) },
			description: 'Содержимое тега при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<ITagsItem>(Object) },
			description: 'Перед содержимым тега',
		},
		'item-trailing': {
			scope: { item: defineType<ITagsItem>(Object) },
			description: 'После содержимого тега',
		},
	},
	props: {
		closable: { type: Boolean, triggers: ['change:closable'] },
	},
})
