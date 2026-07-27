import type { IContribution } from '@soldy/accessor'

export const ListBoxContribution: IContribution = {
	props: [
		{ name: 'view', type: String, triggers: ['change:view'] },
	],
}
