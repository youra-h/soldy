import type { IContribution } from '@soldy/accessor'

export const CollapseItemCustomContribution: IContribution = {
	props: [
		{ name: 'tag', type: String, triggers: ['change:tag'] },
		{ name: 'text', type: String, triggers: ['change:text'] },
		{ name: 'arrowPlacement', type: String, triggers: ['change:arrowPlacement'] },
	],
}
