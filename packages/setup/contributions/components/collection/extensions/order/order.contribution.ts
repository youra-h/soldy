import type { ICollectionContribution } from '@soldy/accessor'

export const OrderExtensionContribution: ICollectionContribution = {}

/** order на уровне элемента (TabItem, CollapseItem, ListBoxItem) */
export const OrderItemExtensionContribution: ICollectionContribution = {
	props: [{ name: 'order', protected: true, triggers: ['change:order'] }],
}
