import type { IContribution } from '@soldy/accessor'

export const TabsExtensionContribution: IContribution = {
	events: ['item:close'],
}

export const TabsItemExtensionContribution: IContribution = {
	props: [
		{
			name: '_closable',
			protected: true,
			triggers: ['change:closable'],
			get: (ext) => ext.closable,
		},
	],
}
