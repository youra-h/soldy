import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution = (): IContribution => ({
	props: {
		rendered: { type: Boolean, triggers: ['change:rendered'] },
		visible: { type: Boolean, triggers: ['change:visible'] },
		present: {
			type: Boolean,
			protected: true,
			triggers: ['change:rendered', 'change:visible'],
		},
		tag: { type: [String, Object], triggers: ['change:tag'] },
		classes: {
			type: Object,
			protected: true,
			triggers: ['change:classes'],
		},
	},
	events: ['show', 'hide', 'show:before', 'show:after', 'hide:before', 'hide:after', 'ready'],
})
