import type { ICollectionContribution } from '@soldy/accessor'

export const TabsExtensionContribution: ICollectionContribution = {
	events: ['item:close'],
}

export const TabsItemExtensionContribution: ICollectionContribution = {
	props: [{ name: '_closable', protected: true, triggers: ['change:closable'] }],
}
