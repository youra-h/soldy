import { defineCollection } from '../base'
import { TabsCollectionContribution } from '../../../contributions/tabs'
import { TCollection, TPlainExtension, TActivationExtension } from '@soldy/core'
import { TTabsExtension } from '@soldy/core'
import type { ITabItem } from '@soldy/core'

/**
 * Дескриптор коллекции табов.
 *
 * factory создаёт TCollection с расширениями plain, activation и tabs.
 * TTabsExtension получает ссылку на владельца (TTabs) через options.owner.
 */
export const TabsCollectionDescriptor = defineCollection<ITabItem>({
	factory: (owner: any) =>
		new TCollection<ITabItem>({
			extensions: {
				plain:      new TPlainExtension<ITabItem>(),
				activation: new TActivationExtension<ITabItem>(),
				tabs:       new TTabsExtension({ owner }),
			},
		}),
	contribution: TabsCollectionContribution,
})
