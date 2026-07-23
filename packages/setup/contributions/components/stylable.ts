import type { IContribution } from '@soldy/accessor'

export const StylableContribution: IContribution = {
	props: [
		{ name: 'size', triggers: ['change:size'] },
		{ name: 'variant', triggers: ['change:variant'] },
	],
}
