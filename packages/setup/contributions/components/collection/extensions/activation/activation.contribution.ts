import type { IContribution } from '@soldy/accessor'
// import { defineType } from './../../../../defineType'

/** activeItem на родительском уровне (Tabs, Collapse) */
export const ActivationExtensionContribution = (): IContribution => ({
	props: {
		activeItem: {
			// type: defineType<>(Object),
			type: Object,
			protected: true,
			triggers: ['change:activation'],
		},
	},
	events: ['item:activated', 'item:deactivated'],
})

/** active на уровне элемента (TabItem, CollapseItem) */
export const ActivationItemExtensionContribution = (): IContribution => ({
	props: { active: { type: Boolean, triggers: ['change:active'] } },
})
