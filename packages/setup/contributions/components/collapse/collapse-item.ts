import type { IContribution } from '@soldy/accessor'

export const CollapseItemContribution: IContribution = {
	props: [
		{ name: 'view', type: String, triggers: ['change:view'] },
	],
}
