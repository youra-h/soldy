import type { IContribution } from '@soldy/accessor'

export const TabsExtensionContribution: IContribution = {
	events: ['item:close'],
}

export const TabsItemExtensionContribution: IContribution = {
	props: [
		{
			name: 'closable',
			protected: true,
			triggers: ['change:closable'],
		},
	],
}
