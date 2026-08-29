import type { IContribution } from '@soldy/accessor'

export const TabItemContribution = (): IContribution => ({
	props: [
		{ name: 'text', type: String, triggers: ['change:text'] },
		{ name: 'closable', type: Boolean, triggers: ['change:closable'] },
	],
})
