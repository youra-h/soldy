import type { IContribution } from '@soldy/accessor'

export const CollapseExtensionContribution = (): IContribution => ({})

export const CollapseItemExtensionContribution = (): IContribution => ({
	props: {
		view: {
			type: String,
			protected: true,
			triggers: ['change:view'],
		},
	},
})
