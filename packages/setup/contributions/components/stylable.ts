import type { IContribution } from '@soldy/accessor'

export const StylableContribution = (): IContribution => ({
	props: {
		size: { type: String, triggers: ['change:size'] },
		variant: { type: String, triggers: ['change:variant'] },
	},
})
