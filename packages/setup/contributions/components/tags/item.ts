import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'

/**
 * Слоты элемента Tags.
 *
 * `close-icon` — подмена иконки закрытия в одном месте; по умолчанию берётся
 * из пакета иконок по роли `close` (см. `ICON_ROLES`).
 */
export type TTagsItemSlots = {
	leading: {}
	default: { text: string; selected: boolean }
	trailing: {}
	'close-icon': {}
}

export const TagsItemContribution = (): IContribution => ({
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
		 * описывает сам тег, а это — вложенная в него кнопка.
		 */
		closeAria: {
			type: Object,
			protected: true,
			triggers: ['change:closeLabel', 'change:text'],
		},
	},
})
