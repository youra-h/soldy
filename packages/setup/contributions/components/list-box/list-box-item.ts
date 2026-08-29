import type { IContribution } from '@soldy/accessor'

export const ListBoxItemContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
