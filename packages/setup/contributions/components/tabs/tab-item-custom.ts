import type { IContribution } from '@soldy/accessor'

export const TabItemCustomContribution: IContribution = {
	props: [
		{ name: 'tag', triggers: ['change:tag'] },
		{ name: 'text', triggers: ['change:text'] },
		{ name: 'closable', triggers: ['change:closable'] },
	],
	events: ['close'],
}
