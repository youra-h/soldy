import type { IContribution } from '@soldy/accessor'

export const OrderExtensionContribution: IContribution = {}

/** order на уровне элемента */
export const OrderItemExtensionContribution: IContribution = {
	props: [
		{
			name: '_order',
			protected: true,
			triggers: ['change:order'],
			get: (ext) => ext.order,
		},
	],
}
