import type { IContribution } from '@soldy/accessor'

export const ListItemCustomContribution = (): IContribution => ({
	props: [
		{ name: 'tag', type: String, triggers: ['change:tag'] },
		{ name: 'text', type: String, triggers: ['change:text'] },
		{ name: 'wordWrap', type: Boolean, triggers: ['change:wordWrap'] },
	],
})
