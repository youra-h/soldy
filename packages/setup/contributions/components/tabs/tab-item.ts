import type { IContribution } from '@soldy/accessor'

export const TabItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		closable: { type: Boolean, triggers: ['change:closable'] },
	},
})
