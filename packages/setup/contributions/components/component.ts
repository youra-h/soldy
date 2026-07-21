import type { IContribution } from '@soldy/provider'

export const ComponentContribution: IContribution = {
	props: [
		{ name: 'rendered', triggers: ['change:rendered'] },
		{ name: 'visible', triggers: ['change:visible'] },
		{ name: 'present', protected: true, triggers: ['change:rendered', 'change:visible'] },
	],
	events: ['created', 'show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}
