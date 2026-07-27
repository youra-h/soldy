import type { IContribution } from '@soldy/accessor'

export const SelectableCollectionItemContribution: IContribution = {
	props: [
		{ name: 'selected', type: Boolean, triggers: ['change:selection'] },
	],
}
