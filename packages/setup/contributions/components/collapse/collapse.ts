import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { ICollapseItem } from '@soldy/core'

/**
 * Слоты Collapse.
 *
 * Слоты элементов статические и получают элемент через scope: динамические
 * имена вида `item:<value>:leading` резолвит только Vue. Адресация конкретного
 * элемента — условием внутри слота по `item.value`.
 *
 * Панель отдельным компонентом не стала: она лежит внутри элемента и отдельно
 * от него не существует, поэтому осталась слотом `item-content`. Сравни с
 * Tabs, где панель — сосед списка, пишется отдельно и связывается по `value`.
 */
export type TCollapseSlots = {
	default: {}
	item: { item: ICollapseItem }
	'item-leading': { item: ICollapseItem }
	'item-trailing': { item: ICollapseItem }
	'item-content': { item: ICollapseItem }
}

export const CollapseContribution = (): IContribution => ({
	slots: {
		default: { description: 'Элементы коллекции' },
		item: {
			scope: { item: defineType<ICollapseItem>(Object) },
			description: 'Заголовок элемента при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<ICollapseItem>(Object) },
			description: 'Перед заголовком элемента',
		},
		'item-trailing': {
			scope: { item: defineType<ICollapseItem>(Object) },
			description: 'После заголовка элемента',
		},
		'item-content': {
			scope: { item: defineType<ICollapseItem>(Object) },
			description: 'Содержимое раскрывающейся панели',
		},
	},
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
