import type { IContribution } from '@soldy/accessor'

export const ComponentViewContribution = (): IContribution => ({
	props: {
		tag: { type: [String, Object], triggers: ['change:tag'] },
		classes: {
			type: Object,
			protected: true,
			triggers: ['change:classes'],
		},
	},
	events: ['ready'],
})
