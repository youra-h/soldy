import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { IAccordionItem } from '@soldy/core'
import type { TEmptySlotScope } from '../../types'

/**
 * Слоты Accordion.
 *
 * Слоты элементов статические и получают элемент через scope: динамические
 * имена вида `item:<value>:leading` резолвит только Vue. Адресация конкретного
 * элемента — условием внутри слота по `item.value`.
 *
 * Панель отдельным компонентом не стала: она лежит внутри элемента и отдельно
 * от него не существует, поэтому осталась слотом `item-content`. Сравни с
 * Tabs, где панель — сосед списка, пишется отдельно и связывается по `value`.
 */
export type TAccordionSlots = {
	default: TEmptySlotScope
	item: { item: IAccordionItem }
	'item-leading': { item: IAccordionItem }
	'item-trailing': { item: IAccordionItem }
	'item-content': { item: IAccordionItem }
}

export const AccordionContribution = (): IContribution => ({
	slots: {
		default: { description: 'Элементы коллекции' },
		item: {
			scope: { item: defineType<IAccordionItem>(Object) },
			description: 'Заголовок элемента при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<IAccordionItem>(Object) },
			description: 'Перед заголовком элемента',
		},
		'item-trailing': {
			scope: { item: defineType<IAccordionItem>(Object) },
			description: 'После заголовка элемента',
		},
		'item-content': {
			scope: { item: defineType<IAccordionItem>(Object) },
			description: 'Содержимое раскрывающейся панели',
		},
	},
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
