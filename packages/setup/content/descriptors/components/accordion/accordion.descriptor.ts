/**
 * Дескриптор Accordion (TAccordion).
 *
 * Наследование:
 * - ControlDescriptor (disabled, focused, size, variant, rendered, visible, present, tag, classes)
 *
 * Добавляет: view + плагины (коллекция + drag-and-drop).
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TAccordion } from '@soldy-ui/core'
import type { IAccordionItem } from '@soldy-ui/core'
import { ControlDescriptor } from '../control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
} from '../../plugins'

export const AccordionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordion,

		extends: ControlDescriptor(),

		contribution: {
			/**
			 * Слоты элементов статические и получают элемент через scope:
			 * динамические имена вида `item:<value>:leading` резолвит только Vue.
			 * Адресация конкретного элемента — условием внутри слота по `item.value`.
			 *
			 * Панель отдельным компонентом не стала: она лежит внутри элемента и
			 * отдельно от него не существует, поэтому осталась слотом `item-content`.
			 * Сравни с Tabs, где панель — сосед списка, пишется отдельно и
			 * связывается по `value`.
			 */
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
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Drag-and-drop
			DragPluginDescriptor,
		],
	}),
)
