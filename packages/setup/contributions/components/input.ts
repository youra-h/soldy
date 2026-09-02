import type { IContribution } from '@soldy/accessor'

export const InputContribution: IContribution = {
	props: [
		{ name: 'placeholder', triggers: ['change:placeholder'] },
	],
}
