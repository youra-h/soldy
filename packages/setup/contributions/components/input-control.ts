import type { IContribution } from '@soldy/accessor'

export const InputControlContribution = (): IContribution => ({
	props: {
		readonly: { type: Boolean, triggers: ['change:readonly'] },
		required: { type: Boolean, triggers: ['change:required'] },
	},
})
