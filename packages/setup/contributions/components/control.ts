import type { IContribution } from '@soldy/accessor'

export const ControlContribution = (): IContribution => ({
	props: {
		disabled: { type: Boolean, triggers: ['change:disabled'] },
		focused: { type: Boolean, triggers: ['change:focused'] },
		/**
		 * Как `classes`: protected-проп, который ядро вычисляет, а шаблон
		 * раскладывает спредом. Триггеры — те же события, от которых зависит
		 * содержимое набора (см. TControl.aria и TButton.aria).
		 */
		aria: {
			type: Object,
			protected: true,
			triggers: ['change:disabled', 'change:tag'],
		},
	},
})
