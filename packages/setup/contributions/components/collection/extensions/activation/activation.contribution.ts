import type { IContribution } from '@soldy/accessor'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationExtensionContribution: IContribution = {
	props: [
		{
			name: 'activeItem',
			type: Object,
			protected: true,
			triggers: ['change:activation'],
		},
	],
	events: ['item:activated', 'item:deactivated'],
}

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemExtensionContribution: IContribution = {
	props: [{ name: 'active', type: Boolean, triggers: ['change:active'] }],
}
