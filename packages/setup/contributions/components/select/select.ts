import type { IContribution } from '@soldy/accessor'
import { defineType } from '../../defineType'
import { LIST_PROPS } from '../list'
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
	leading: {}
	clear: {}
	'arrow-icon': {}
	trailing: {}
	default: {}
	empty: {}
}

export const SelectContribution = (): IContribution => ({
	slots: {
		field: { description: 'Содержимое поля вместо текста выбранного' },
		/**
		 * `leading` и `trailing` — проброс одноимённых слотов Input: у него
		 * они уже есть, и заводить своё было бы вторым способом делать то же
		 * самое. `trailing` идёт после кнопки очистки и стрелки, то есть
		 * дополняет их, а не заменяет.
		 */
		leading: { description: 'Перед полем' },
		clear: { description: 'Кнопка очистки значения' },
		'arrow-icon': { description: 'Стрелка состояния панели' },
		trailing: { description: 'После стрелки' },
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
		editable: { type: Boolean, triggers: ['change:editable'] },
		/**
		 * Имя кнопки очистки. Отдельный набор, а не часть `aria`: `aria`
		 * описывает само поле, а это соседняя кнопка.
		 */
		clearAria: {
			type: Object,
			protected: true,
			triggers: ['change:clearLabel', 'change:name'],
		},
		/** Можно ли открыть панель: запрещает только `disabled`. */
		openable: {
			type: Boolean,
			protected: true,
			triggers: ['change:disabled'],
		},
		/**
		 * Подгонять ли ширину панели под поле — производное от `contentFit`.
		 *
		 * Вычисляет ядро, шаблон только пробрасывает в `anchor_matchWidth`.
		 * Оставь выражение `contentFit !== 'expand'` в разметке — и оно
		 * повторится в каждом из шести адаптеров.
		 */
		autoFitWidth: {
			type: Boolean,
			protected: true,
			triggers: ['change:contentFit'],
		},
		// Общие с ListBox — объявлены один раз в `components/list.ts`
		...LIST_PROPS,
	},
	events: ['open', 'close'],
})
