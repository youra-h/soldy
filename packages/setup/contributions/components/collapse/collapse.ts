import type { IContribution } from '@soldy/accessor'

export const CollapseContribution = (): IContribution => ({
	props: {
		view: { type: String, triggers: ['change:view'] },
	},
})
