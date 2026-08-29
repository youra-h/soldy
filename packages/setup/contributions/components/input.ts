import type { IContribution } from '@soldy/accessor'

export const InputContribution = (): IContribution => ({
	props: {
		placeholder: { type: String, triggers: ['change:placeholder'] },
	},
})
