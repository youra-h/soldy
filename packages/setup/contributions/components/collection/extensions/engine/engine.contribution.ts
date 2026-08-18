import type { ICollectionContribution } from '@soldy/accessor'

export const EngineContribution: ICollectionContribution = {
	props: [
		{
			name: 'items',
			triggers: ['change:items'],
			get: (core) => [...core.engine],
			set: (core, val) => core.extensions.batch?.update(val),
		},
		{
			name: 'count',
			triggers: ['change:count'],
			protected: true,
			get: (core) => core.engine.length,
		},
	],
	events: ['change:items', 'change:count', 'reset', 'item:added', 'item:removed', 'item:updated', 'item:moved'],
}
