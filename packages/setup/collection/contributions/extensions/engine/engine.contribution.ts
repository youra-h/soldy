import type { ICollectionContribution } from '@soldy/accessor'

export const EngineContribution: ICollectionContribution = {
	props: [
		{ name: 'items', source: 'engine', triggers: ['change:items'] },
		{ name: 'count', source: 'engine', triggers: ['change:count'], protected: true },
	],
	events: ['change:items', 'change:count', 'reset', 'item:added', 'item:removed', 'item:updated', 'item:moved'],
}
