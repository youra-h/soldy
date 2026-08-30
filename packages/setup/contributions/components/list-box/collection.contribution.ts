import type { IContribution } from '@soldy/accessor'

export const ListBoxExtensionContribution = (): IContribution => ({})

export const ListBoxItemExtensionContribution = (): IContribution => ({
	props: {
		wordWrap: {
			type: Boolean,
			protected: true,
			triggers: ['change:wordWrap'],
		},
		view: {
			type: String,
			protected: true,
			triggers: ['change:view'],
		},
	},
})
