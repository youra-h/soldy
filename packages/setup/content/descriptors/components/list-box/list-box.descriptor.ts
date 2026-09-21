/**
 * Дескриптор ListBox (TListBox).
 *
 * Наследует `ValueControlDescriptor` и добавляет `view` плюс плагины коллекции,
 * списка и drag-and-drop.
 *
 * Именно `ValueControl`, а не `Control`: у списка есть значение — то, что
 * выбрано. Выбор был всегда, но отдавался наружу списком объектов
 * (`selected: TItem[]`), то есть внутренней моделью коллекции; потребителю
 * нужен ответ в значениях, и он же уходит в форму.
 *
 * Списочные свойства (`maxRows`, `contentFit`, `scrollBehavior`) приходят из
 * `LIST_PROPS` — общей с Select декларации. Общая там только декларация:
 * реализация у каждого своя, потому что предок занят.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TListBox } from '@soldy/core'
import type { IListBoxItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	DragPluginDescriptor,
	ListHeightPluginDescriptor,
	ListKeyboardPluginDescriptor,
	ListScrollPluginDescriptor,
} from '../../plugins'
import { LIST_PROPS } from '../list'

export const ListBoxDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBox,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Панели у списка нет: выбор элемента не раскрывает содержимое, поэтому
			 * части `Content` здесь не существует — в отличие от Tabs и от слота
			 * `item-content` у Accordion. Слоты элементов статические и получают
			 * элемент через scope (см. Accordion).
			 */
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
				// Общие с Select — объявлены один раз в `components/list.ts`
				...LIST_PROPS,
			},
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Высота по `maxRows` — единственное списочное свойство, которому
			// нужен плагин: остальные ядро применяет само
			ListHeightPluginDescriptor,
			// Клавиатура и прокрутка (последняя читает `scrollBehavior`)
			ListKeyboardPluginDescriptor,
			ListScrollPluginDescriptor,
			// Drag-and-drop
			DragPluginDescriptor,
		],
	}),
)
