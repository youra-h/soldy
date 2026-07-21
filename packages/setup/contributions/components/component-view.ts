import type { IContribution } from '@soldy/provider'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', triggers: ['change:tag'] },
		{ name: 'classes', protected: true, triggers: ['change:classes'] },
	],
	events: ['ready'],
}
