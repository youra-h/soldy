import type { IContribution } from '@soldy/accessor'

export const TabsItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		closable: { type: Boolean, triggers: ['change:closable'] },
		closeLabel: { type: String, triggers: ['change:closeLabel'] },
		/**
		 * Имя кнопки закрытия. Отдельный набор, а не часть `aria`: `aria`
		 * описывает сам таб, а это вложенная в него кнопка.
		 */
		closeAria: {
			type: Object,
			protected: true,
			triggers: ['change:closeLabel', 'change:text'],
		},
	},
})
