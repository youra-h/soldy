import type { IContribution } from '@soldy/accessor'

export const ListItemCustomContribution = (): IContribution => ({
	props: {
		tag: { type: String, triggers: ['change:tag'] },
		text: { type: String, triggers: ['change:text'] },
		wordWrap: { type: Boolean, triggers: ['change:wordWrap'] },
	},
})
