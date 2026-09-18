/**
 * Дескриптор TagsItem (TTagsItem).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...), добавляет `text`, `closable`, `closeLabel`, `closeAria`.
 * Плагина подсветки здесь нет — в отличие от ListBoxItem тег не участвует в
 * клавиатурной навигации списка.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../define'
import { TTagsItem } from '@soldy/core'
import type { ITagsItemProps, TTagsItemEvents } from '@soldy/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import type { TEmptySlotScope } from '../../../define'

/**
 * Слоты элемента Tags.
 *
 * `close-icon` — подмена иконки закрытия в одном месте; по умолчанию берётся
 * из пакета иконок по роли `close` (см. `ICON_ROLES`).
 */
export type TTagsItemSlots = {
	leading: TEmptySlotScope
	default: { text: string; selected: boolean }
	trailing: TEmptySlotScope
	'close-icon': TEmptySlotScope
}

export const TagsItemDescriptor = defineDescriptor(() =>
	defineComponent<ITagsItemProps, TTagsItemEvents>()({
		ctor: TTagsItem,

		extends: ValueControlDescriptor(),

		contribution: {
			slots: {
				leading: { description: 'Перед текстом тега' },
				default: {
					scope: {
						text: defineType<string>(String),
						selected: defineType<boolean>(Boolean),
					},
					description: 'Содержимое тега. Задано — переопределяет проп text',
				},
				trailing: { description: 'После текста тега' },
				'close-icon': { description: 'Иконка кнопки закрытия' },
			},
			props: {
				text: { type: String, triggers: ['change:text'] },
				closable: { type: Boolean, triggers: ['change:closable'] },
				closeLabel: { type: String, triggers: ['change:closeLabel'] },
				/**
				 * Имя кнопки закрытия. Отдельный набор, а не часть `aria`: `aria`
				 * описывает сам тег, а это — кнопка рядом с ним.
				 */
				closeAria: {
					type: Object,
					protected: true,
					triggers: ['change:closeLabel', 'change:text'],
				},
			},
		},
	}),
)
