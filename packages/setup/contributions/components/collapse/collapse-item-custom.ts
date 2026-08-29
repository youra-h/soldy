import type { IContribution } from '@soldy/accessor'

export const CollapseItemCustomContribution = (): IContribution => ({
	props: {
		tag: { type: String, triggers: ['change:tag'] },
		text: { type: String, triggers: ['change:text'] },
		arrowPlacement: { type: String, triggers: ['change:arrowPlacement'] },
	},
})
