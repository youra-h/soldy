import type { IContribution } from '@soldy/accessor'

export const ListBoxContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
