import type { IContribution } from '@soldy/accessor'

export const ListItemCustomContribution: IContribution = {
	props: [
		{ name: 'tag', triggers: ['change:tag'] },
		{ name: 'text', triggers: ['change:text'] },
		{ name: 'wordWrap', triggers: ['change:wordWrap'] },
	],
}
