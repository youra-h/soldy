import type { ICollectionContribution } from '@soldy/accessor'

/**
 * Контрибуция TTabItemExtension (item-адаптер).
 * closable — резолвится из элемента ?? TTabs.closable.
 */
export const TabsItemExtensionContribution: ICollectionContribution = {
	props: [
		{ name: 'closable', protected: true, triggers: ['change:closable'] },
	],
}
