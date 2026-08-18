import type { ICollectionContribution } from '@soldy/accessor'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationContribution: ICollectionContribution = {
	props: [
		{ name: 'activeItem', protected: true, triggers: ['change:activation'] },
	],
	events: ['change:activation', 'item:activated', 'item:deactivated'],
}

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemContribution: ICollectionContribution = {
	props: [
		{ name: 'active', triggers: ['change:active'] },
	],
}
