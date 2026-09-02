import type { IContribution } from '@soldy/accessor'

export const TextableContribution: IContribution = {
	props: [
		{ name: 'text', triggers: ['change:text'] },
	],
}
