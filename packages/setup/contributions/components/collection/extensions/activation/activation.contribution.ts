import type { ICollectionContribution } from '@soldy/accessor'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationExtensionContribution: ICollectionContribution = {
	props: [{
		name: '_activeItem',
		protected: true,
		triggers: ['change:activation'],
		// activation.activeItem — реальное имя свойства не совпадает с _activeItem
		get: (activation: any) => activation.activeItem,
	}],
	events: ['item:activated', 'item:deactivated'],
}

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemExtensionContribution: ICollectionContribution = {
	props: [{ name: 'active', triggers: ['change:active'] }],
}
