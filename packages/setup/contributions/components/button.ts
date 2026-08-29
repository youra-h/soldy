import type { IContribution } from '@soldy/accessor'

export const ButtonContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
