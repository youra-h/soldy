import type { IContribution } from '@soldy/accessor'

export const ComponentContribution = (): IContribution => ({
	props: {
		rendered: { type: Boolean, triggers: ['change:rendered'] },
		visible: { type: Boolean, triggers: ['change:visible'] },
		present: {
			type: Boolean,
			protected: true,
			triggers: ['change:rendered', 'change:visible'],
		},
	},
	events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after'],
})
