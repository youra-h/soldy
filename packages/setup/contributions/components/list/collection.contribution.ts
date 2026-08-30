import type { IContribution } from '@soldy/accessor'

export const ListExtensionContribution = (): IContribution => ({})

export const ListItemExtensionContribution = (): IContribution => ({
	props: {
		wordWrap: {
			type: Boolean,
			protected: true,
			triggers: ['change:wordWrap'],
		},
	},
})
