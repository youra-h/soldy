import type { IContribution } from '@soldy/accessor'

export const StylableContribution = (): IContribution => ({
	props: [
		{ name: 'size', type: String, triggers: ['change:size'] },
		{ name: 'variant', type: String, triggers: ['change:variant'] },
	],
})
