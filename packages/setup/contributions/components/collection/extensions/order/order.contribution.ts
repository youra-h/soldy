import type { IContribution } from '@soldy/accessor'

export const OrderExtensionContribution = (): IContribution => ({})

/** order на уровне элемента */
export const OrderItemExtensionContribution = (): IContribution => ({
	props: {
		order: {
			type: Number,
			protected: true,
			triggers: ['change:order'],
		},
	},
})
