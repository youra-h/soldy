import type { IContribution } from '@soldy/accessor'

export const ListItemPluginContribution: IContribution = {
	props: [{ name: 'highlighted', protected: true, triggers: ['change:highlighted'] }],
}
