import type { IContribution } from '@soldy/provider'

export const EntityContribution: IContribution = {
	props: [
		{ name: 'ctrl', protected: true },
		{ name: 'plugins', protected: true },
	],
}
