import type { IContribution } from '@soldy/accessor'

export const InteractiveContribution = (): IContribution => ({
	props: [
		{ name: 'disabled', type: Boolean, triggers: ['change:disabled'] },
		{ name: 'focused', type: Boolean, triggers: ['change:focused'] },
	],
})
