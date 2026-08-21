import type { IContribution } from '@soldy/accessor'

export const ComponentContribution: IContribution = {
	props: [
		{ name: 'rendered', type: Boolean, triggers: ['change:rendered'] },
		{ name: 'visible', type: Boolean, triggers: ['change:visible'] },
		{
			name: '_present',
			type: Boolean,
			protected: true,
			get: (instance) => instance.present,
			triggers: ['change:rendered', 'change:visible'],
		},
	],
	events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}
