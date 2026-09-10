import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { TABS_EXTENSIONS, TABS_OWNER_EXTENSIONS } from './factory'
import type { TTabsCollection } from './types'
import type { ITabs } from '../types'

/**
 * Коллекция Tabs целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: активный таб, `size`, `variant` и `disabled` элементы
 * получают от компонента, и без него набор неполон. Нужна коллекция без
 * компонента — берите `createEngine` или `createEngineActivation`: недостающее
 * `<Tabs>` доустановит сам.
 */
export function createEngineTabs(
	options: TCreateEngineOptions & { owner: ITabs },
): TTabsCollection {
	return createComponentEngine(
		'createEngineTabs',
		TABS_EXTENSIONS(),
		TABS_OWNER_EXTENSIONS,
		options,
	) as TTabsCollection
}
