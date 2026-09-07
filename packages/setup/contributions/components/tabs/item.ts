import type { IContribution } from '@soldy/accessor'

export const TabsItemContribution = (): IContribution => ({
	props: {
		text: { type: String, triggers: ['change:text'] },
		closable: { type: Boolean, triggers: ['change:closable'] },
	},
})
