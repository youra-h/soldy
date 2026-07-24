import type { IContribution } from '@soldy/accessor'

export const SelectableCollectionItemContribution: IContribution = {
	props: [
		{ name: 'selected', triggers: ['change:selection'] },
	],
}
