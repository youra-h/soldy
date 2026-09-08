import type { IContribution } from '@soldy/accessor'

/**
 * Слоты опции — те же три, что у элементов остальных списков: перед текстом,
 * текст, после текста. Совпадение не случайно, строку рисует один и тот же
 * `Button`.
 */
export type TSelectItemSlots = {
	leading: {}
	default: { text: string; selected: boolean }
	trailing: {}
}

export const SelectItemContribution = (): IContribution => ({
	slots: {
		leading: { description: 'Перед текстом опции' },
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
