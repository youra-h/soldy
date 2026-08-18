import type { IContribution } from '@soldy/accessor'

export const ListItemPluginContribution: IContribution = {
	props: [{ name: '_highlighted', protected: true, triggers: ['change:highlighted'] }],
}
