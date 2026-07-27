import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', type: String, triggers: ['change:tag'] },
		{ name: 'classes', type: Object, protected: true, triggers: ['change:classes'] },
	],
	events: ['ready'],
}
