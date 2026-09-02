import type { IContribution } from '@soldy/accessor'

export const InteractiveContribution: IContribution = {
	props: [
		{ name: 'disabled', triggers: ['change:disabled'] },
		{ name: 'focused', triggers: ['change:focused'] },
	],
}
