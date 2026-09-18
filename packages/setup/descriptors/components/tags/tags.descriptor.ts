/**
 * Дескриптор Tags (TTags).
 *
 * Наследует `ValueControlDescriptor` и добавляет `closable` плюс плагины
 * коллекции. В отличие от ListBox здесь нет списочных плагинов (высота,
 * клавиатура, прокрутка) и drag-and-drop: теги — ряд кнопок, а не
 * фокусируемый список, см. AGENTS «Граница переиспользования».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TTags } from '@soldy/core'
import type { ITagsProps, TTagsEvents, ITagsItem } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
} from '../../plugins'
import type { TEmptySlotScope } from '../../../define'

/**
 * Слоты Tags.
 *
 * Tags — не список: заголовка/подвала ListBox здесь нет, потому что у задачи
 * нет потребителя для них. Слоты элементов статические и получают элемент
 * через scope (см. ListBox).
 */
export type TTagsSlots = {
	default: TEmptySlotScope
	item: { item: ITagsItem }
	'item-leading': { item: ITagsItem }
	'item-trailing': { item: ITagsItem }
}

export const TagsDescriptor = defineDescriptor(() =>
	defineComponent<ITagsProps, TTagsEvents, TTagsSlots>()({
		ctor: TTags,

		extends: ValueControlDescriptor(),

		contribution: {
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
			},
		},

		plugins: [
			// Коллекция: реестр bundles + доступ к DOM-элементам
			CollectionBundlesPluginDescriptor(),
			CollectionElementsPluginDescriptor(),
		],
	}),
)
