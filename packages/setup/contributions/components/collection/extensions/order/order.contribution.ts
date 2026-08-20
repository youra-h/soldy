import type { ICollectionContribution } from '@soldy/accessor'

export const OrderExtensionContribution: ICollectionContribution = {}

/** order на уровне элемента (TabItem, CollapseItem, ListBoxItem) */
export const OrderItemExtensionContribution: ICollectionContribution = {
	props: [{
		name: '_order',
		protected: true,
		triggers: ['change:order'],
		// orderItemExt.order — реальное имя свойства не совпадает с _order
		get: (ext: any) => ext.order,
	}],
}
