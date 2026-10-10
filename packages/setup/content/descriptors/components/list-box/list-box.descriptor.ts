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
import { TListBox } from '@soldy-ui/core'
import type { IListBoxItem } from '@soldy-ui/core'
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
			 *
			 * Каждый слот элемента есть у списка как `item-<слот>` (`default` —
			 * `item`), и scope у него — scope слота элемента плюс сам элемент:
			 * слот, перенесённый из разметки элемента в `items`, не теряет ни
			 * места, ни данных.
			 *
			 * `empty` показывается, пока элементов нет, — как у Select: пустой
			 * `listbox` для скринридера — тупик, а сообщение объясняет, что
			 * происходит.
			 */
			slots: {
				default: { description: 'Элементы коллекции' },
				header: { description: 'Над списком' },
				footer: { description: 'Под списком' },
				empty: { description: 'Когда элементов нет' },
				item: {
					scope: {
						item: defineType<IListBoxItem>(Object),
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
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
				'item-indicator-icon': {
					scope: {
						item: defineType<IListBoxItem>(Object),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Отметка выбранного элемента',
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
			// нужен плагин: остальные ядро применяет само. Стоит раньше
			// прокрутки: предел строк ставится на `ready` корня, и начальная
			// прокрутка к выбранному на том же `ready` видит список уже в нём
			ListHeightPluginDescriptor,
			// Клавиатура и прокрутка (последняя читает `scrollBehavior`)
			ListKeyboardPluginDescriptor,
			ListScrollPluginDescriptor,
			// Drag-and-drop
			DragPluginDescriptor,
		],
	}),
)
