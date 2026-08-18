import type { ICollectionContribution } from '@soldy/accessor'

/** cn — передача внешней коллекции (аналог ctrl для компонентов) */
export const CollectionBaseContribution: ICollectionContribution = {
	props: [
		{ name: 'cn', triggers: [] },
	],
}
