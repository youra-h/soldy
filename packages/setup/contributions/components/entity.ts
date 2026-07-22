import type { IContribution } from '@soldy/accessor'

export const EntityContribution: IContribution = {
	props: [
		{ name: 'ctrl', protected: true },
		{ name: 'plugins', protected: true },
	],
}
