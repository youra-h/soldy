import type { IContribution } from '@soldy/accessor'

export const CollapseItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
	},
})
