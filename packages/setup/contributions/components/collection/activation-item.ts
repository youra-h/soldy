import type { IContribution } from '@soldy/accessor'

/**
 * Контрибуция TActivationItemExtension.
 *
 * Проп active (protected) — активен ли элемент.
 * Событие change:active — изменение активности элемента.
 */
export const ActivationItemExtensionContribution: IContribution = {
	props: [
		{
			name: 'active',
			type: Boolean,
			triggers: ['change:active'],
		},
	],
}
