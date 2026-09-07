import type { IContribution } from '@soldy/accessor'

export const ControlContribution = (): IContribution => ({
	props: {
		disabled: { type: Boolean, triggers: ['change:disabled'] },
		focused: { type: Boolean, triggers: ['change:focused'] },
		// `aria` объявлен в ComponentViewContribution — набор нужен и
		// неинтерактивным слоям, а второе объявление accessor не примет.
	},
})
