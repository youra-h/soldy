import type { IContribution } from '@soldy/provider'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', mutable: true, triggers: ['change:tag'] },
		{ name: 'classes', mutable: false, public: false, triggers: ['change:classes'] },
	],
	events: ['ready'],
}
