import type { IContribution } from '@soldy/accessor'

export const InteractiveContribution = (): IContribution => ({
	props: {
		disabled: { type: Boolean, triggers: ['change:disabled'] },
		focused: { type: Boolean, triggers: ['change:focused'] },
	},
})
