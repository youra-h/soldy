import type { IContribution } from '@soldy/accessor'

export const InputControlContribution = (): IContribution => ({
	props: {
		readonly: { type: Boolean, triggers: ['change:readonly'] },
		required: { type: Boolean, triggers: ['change:required'] },
		/**
		 * `id` элемента формы. Пусто — ядро берёт `uid`, поэтому проп можно не
		 * задавать; задают там, где на поле ссылаются `<label for>` или
		 * `aria-labelledby`.
		 */
		id: { type: String, triggers: ['change:id'] },
	},
})
