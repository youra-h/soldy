import type { IContribution } from '@soldy/accessor'

export const ButtonContribution: IContribution = {
	props: [
		{ name: 'view', triggers: ['change:view'] },
	],
}
