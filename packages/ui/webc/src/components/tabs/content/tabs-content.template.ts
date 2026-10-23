/** Содержимое неактивной панели — вне документа (`showSlot`): поля в нём не уходят с формой. */

import type { ITabsContent, TTabsContentCollectionFacade } from '@soldy-ui/core'
import { DEFAULT_SLOT } from '@soldy-ui/setup'
import { bind, type ITemplate } from '../../../adapter'

export const tabsContentTemplate: ITemplate<ITabsContent, TTabsContentCollectionFacade> = {
	create: (root) => ({ slots: { default: { mode: 'append', node: root } } }),

	bindings: [
		bind('active', ({ state, showSlot }) => {
			showSlot(DEFAULT_SLOT, state.active === true)
		}),
	],
}
