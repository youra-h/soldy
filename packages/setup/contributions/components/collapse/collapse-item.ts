import type { IContribution } from '@soldy/accessor'

export const CollapseItemContribution: IContribution = {
	props: [
		{ name: 'view', triggers: ['change:view'] },
	],
}
