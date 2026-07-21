import type { IContribution } from '@soldy/provider'

export const ComponentContribution: IContribution = {
	props: [
		{ name: 'rendered', mutable: true, triggers: ['change:rendered'] },
		{ name: 'visible', mutable: true, triggers: ['change:visible'] },
		{ name: 'present', mutable: false, public: false, triggers: ['change:rendered', 'change:visible'] },
	],
	events: ['created', 'show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
}
