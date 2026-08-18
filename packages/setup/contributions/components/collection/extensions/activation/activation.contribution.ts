import type { ICollectionContribution } from '@soldy/accessor'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationExtensionContribution: ICollectionContribution = {
	props: [{ name: '_activeItem', protected: true, triggers: ['change:activation'] }],
	events: ['item:activated', 'item:deactivated'],
}

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemExtensionContribution: ICollectionContribution = {
	props: [{ name: 'active', triggers: ['change:active'] }],
}
