import type { IContribution } from '@soldy/accessor'

export const InputContribution = (): IContribution => ({
	props: [
		{ name: 'placeholder', type: String, triggers: ['change:placeholder'] },
	],
})
