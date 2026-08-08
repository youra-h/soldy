import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TOrderItemExtension.
 *
 * Проп order (protected) — порядковый номер элемента в коллекции.
 * Событие change:order — изменение порядка.
 */
export const OrderItemExtensionContribution: IContribution = {
	props: [
		{
			name: 'order',
			type: Number,
			protected: true,
			triggers: ['change:order'],
		},
	],
}
