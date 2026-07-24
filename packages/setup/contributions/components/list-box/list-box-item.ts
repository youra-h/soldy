import type { IContribution } from '@soldy/accessor'

export const ListBoxItemContribution: IContribution = {
	props: [
		{ name: 'view', triggers: ['change:view'] },
	],
}
