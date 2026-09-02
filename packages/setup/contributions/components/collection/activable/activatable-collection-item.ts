import type { IContribution } from '@soldy/accessor'

export const ActivatableCollectionItemContribution: IContribution = {
	props: [
		{ name: 'active', triggers: ['change:activation'] },
	],
}
