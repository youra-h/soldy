import type { IContribution } from '@soldy/accessor'

export const CollapseItemCustomContribution: IContribution = {
	props: [
		{ name: 'tag', triggers: ['change:tag'] },
		{ name: 'text', triggers: ['change:text'] },
		{ name: 'arrowPlacement', triggers: ['change:arrowPlacement'] },
	],
}
