import type { IContribution } from '@soldy/accessor'

export const ListItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		wordWrap: { type: Boolean, triggers: ['change:wordWrap'] },
	},
})
