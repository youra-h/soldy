import type { IContribution } from '@soldy/accessor'
import type { TEmptySlotScope } from '../../types'

/**
 * Слоты опции — те же три, что у элементов остальных списков: перед текстом,
 * текст, после текста. Совпадение не случайно, строку рисует один и тот же
 * `Button`.
 */
export type TSelectItemSlots = {
	leading: TEmptySlotScope
	default: { text: string; selected: boolean }
	trailing: TEmptySlotScope
	'indicator-icon': { selected: boolean }
}

export const SelectItemContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед текстом опции' },
		'indicator-icon': {
			scope: { selected: Boolean },
			description: 'Отметка выбранной опции',
		},
		default: {
			scope: {
				text: String,
				selected: Boolean,
			},
			description: 'Содержимое опции. Задано — переопределяет проп text',
		},
		trailing: { description: 'После текста опции' },
	},
	props: {
		text: { type: String, triggers: ['change:text'] },
	},
})
