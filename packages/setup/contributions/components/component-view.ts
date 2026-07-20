import type { IContribution } from '@soldy/provider'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', kind: 'state', triggers: ['change:tag'] },
		{ name: 'classes', kind: 'computed', public: false, triggers: ['change:classes'] },
	],
	events: ['ready'],
}
