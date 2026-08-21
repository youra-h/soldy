import type { IContribution } from '@soldy/accessor'

export const ListItemPluginContribution: IContribution = {
	props: [
		{
			name: '_highlighted',
			protected: true,
			get: (instance) => instance.highlighted,
			triggers: ['change:highlighted'],
		},
	],
}
