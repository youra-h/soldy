import type { IContribution } from '@soldy/accessor'

export const ControlContribution = (): IContribution => ({
	props: [
		{ name: 'disabled', type: Boolean, triggers: ['change:disabled'] },
		{ name: 'focused', type: Boolean, triggers: ['change:focused'] },
	],
})
