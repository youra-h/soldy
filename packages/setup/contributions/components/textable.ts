import type { IContribution } from '@soldy/accessor'

export const TextableContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
	},
})
