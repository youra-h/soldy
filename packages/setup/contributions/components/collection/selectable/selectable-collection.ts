import type { IContribution } from '@soldy/accessor'

export const SelectableCollectionContribution: IContribution = {
	props: [
		{ name: 'mode', triggers: ['change:mode'] },
	],
	events: [
		'item:selected',
		'item:unselected',
		'change:selected',
		'change:selectedCount',
	],
}
