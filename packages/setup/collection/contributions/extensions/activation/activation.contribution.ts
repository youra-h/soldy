import type { ICollectionContribution } from '@soldy/accessor'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationContribution: ICollectionContribution = {
	props: [
		{ name: 'activeItem', source: 'activation', triggers: ['change:activation'], protected: true },
	],
	events: ['change:activation', 'item:activated', 'item:deactivated'],
}

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemContribution: ICollectionContribution = {
	props: [
		{ name: 'active', source: 'activation', triggers: ['change:activation'] },
	],
}
