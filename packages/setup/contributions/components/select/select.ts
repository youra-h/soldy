import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import type { ISelectItem } from '@soldy/core'

/**
 * Слоты Select.
 *
 * `field` и `clear` отделены от `default` структурно, а не по вкусу:
 * `default` кладётся внутрь `[role=listbox]`, и всё, что туда попадёт,
 * скринридер сочтёт опцией. Поле и кнопка очистки живут снаружи панели.
 *
 * `empty` показывается вместо списка, когда опций нет: пустой `listbox` для
 * скринридера — тупик, а сообщение хотя бы объясняет, что происходит.
 */
export type TSelectSlots = {
	field: {}
	clear: {}
	default: {}
	empty: {}
}

export const SelectContribution = (): IContribution => ({
	slots: {
		field: { description: 'Содержимое поля вместо текста выбранного' },
		clear: { description: 'Кнопка очистки значения' },
		default: { description: 'Опции — элементы коллекции' },
		empty: { description: 'Когда опций нет' },
		item: {
			scope: { item: defineType<ISelectItem>(Object) },
			description: 'Содержимое опции при работе через проп items',
		},
		'item-leading': {
			scope: { item: defineType<ISelectItem>(Object) },
			description: 'Перед содержимым опции',
		},
		'item-trailing': {
			scope: { item: defineType<ISelectItem>(Object) },
			description: 'После содержимого опции',
		},
	},
	props: {
		open: { type: Boolean, triggers: ['change:open'] },
		placeholder: { type: String, triggers: ['change:placeholder'] },
		closeOnSelect: { type: Boolean, triggers: ['change:closeOnSelect'] },
		clearable: { type: Boolean, triggers: ['change:clearable'] },
		clearLabel: { type: String, triggers: ['change:clearLabel'] },
		/**
		 * Имя кнопки очистки. Отдельный набор, а не часть `aria`: `aria`
		 * описывает само поле, а это соседняя кнопка.
		 */
		clearAria: {
			type: Object,
			protected: true,
			triggers: ['change:clearLabel', 'change:name'],
		},
		/** Можно ли открыть панель: `disabled` и `readonly` запрещают. */
		openable: {
			type: Boolean,
			protected: true,
			triggers: ['change:disabled', 'change:readonly'],
		},
	},
	events: ['open', 'close'],
})
