import type { IContribution } from '@soldy/accessor'

/**
 * Базовая контрибуция TCollection.
 */
export const CollectionContribution = (): IContribution => ({
	props: { engine: { triggers: [] } },
})
