import type { IContribution } from '@soldy/accessor'

export const TabItemCustomContribution: IContribution = {
	props: [
		{ name: 'tag', type: String, triggers: ['change:tag'] },
		{ name: 'text', type: String, triggers: ['change:text'] },
		{ name: 'closable', type: Boolean, triggers: ['change:closable'] },
	],
	events: ['close'],
}
