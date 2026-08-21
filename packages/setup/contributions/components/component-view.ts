import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution: IContribution = {
	props: [
		{ name: 'tag', type: [String, Object], triggers: ['change:tag'] },
		{
			name: '_classes',
			type: Object,
			protected: true,
			get: (instance) => instance.classes,
			triggers: ['change:classes'],
		},
	],
	events: ['ready'],
}
