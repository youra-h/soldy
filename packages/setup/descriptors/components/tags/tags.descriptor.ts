/**
 * Дескриптор Tags (TTags).
 *
 * Наследует `ValueControlDescriptor` и добавляет `closable` плюс плагины
 * коллекции и клавиатуру. Списочных плагинов ListBox (высота, подсветка,
 * прокрутка) и drag-and-drop здесь нет: у ListBox фокус на контейнере, а у
 * Tags с выбором он ходит по самим тегам — у каждого свой крестик. Модель —
 * APG Listbox на roving tabindex, как у Tabs: весь набор — одна остановка
 * Tab, стрелки между тегами (`TagsKeyboardPluginDescriptor`). Без выбора
 * (`mode="none"`) набор — список без действия у строк, и клавиатура молчит.
 * См. AGENTS, «Граница переиспользования» и «Готовые паттерны».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TTags } from '@soldy/core'
import type { ITagsItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	TagsKeyboardPluginDescriptor,
	TagsOverflowPluginDescriptor,
} from '../../plugins'

export const TagsDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTags,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Tags — не список: заголовка и подвала ListBox здесь нет, потому что у
			 * задачи нет потребителя для них. Слоты элементов статические и
			 * получают элемент через scope (см. ListBox).
			 */
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
				/**
				 * Внешний вид тегов — модификатор набора: по нему тема рисует
				 * пилюлю каждого тега целиком, вместе с кнопкой закрытия. Тегам
				 * значение не доставляется.
				 */
				view: { type: String, triggers: ['change:view'] },
				/**
				 * Что делать с тегами, которым не хватило ширины ряда: переносить
				 * (`wrap`, по умолчанию), прокручивать (`scroll`) или убирать хвост
				 * в панель за кнопкой «…» (`popover`). Само значение уезжает в тему
				 * через `data-overflow`.
				 */
				overflow: { type: String, triggers: ['change:overflow'] },
				/** Имя кнопки «…» для скринридера. */
				moreLabel: { type: String, triggers: ['change:moreLabel'] },
				/**
				 * Имя кнопки «…» готовым набором: своего экземпляра у неё нет, она
				 * — содержимое слота `trigger` у панели.
				 */
				moreAria: { type: Object, protected: true, triggers: ['change:moreLabel'] },
				/**
				 * Классы панели: теги в ней телепортированы, и селекторы вида до них
				 * не достают. Считает это ядро, а не шаблон каждого адаптера.
				 */
				panelClasses: { type: Array, protected: true, triggers: ['change:classes'] },
				/** ARIA панели: роль повторяет роль ряда. */
				panelAria: { type: Object, protected: true, triggers: ['change:aria'] },
			},
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Клавиатура по APG Listbox, пока выбор включён: стрелки, Home/End, Delete
			TagsKeyboardPluginDescriptor,
			// Замер ряда: сколько тегов помещается в строку в режиме `popover`
			TagsOverflowPluginDescriptor,
		],
	}),
)
