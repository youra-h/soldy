import type { ICollectionContribution } from '@soldy/accessor'

/** order на уровне элемента (TabItem, CollapseItem, ListBoxItem) */
export const OrderItemContribution: ICollectionContribution = {
	props: [
		{ name: 'order', protected: true, triggers: ['change:order'] },
	],
}
