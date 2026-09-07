import type { IContribution } from '@soldy/accessor'

/**
 * `ctrl` и `bundle:create` — обе половины связки адаптера с инстансом, поэтому
 * живут вместе: `ctrl` вносит готовый инстанс снаружи, `bundle:create` отдаёт
 * наружу плагины, появившиеся у этого инстанса при монтировании.
 */
export const EntityContribution = (): IContribution => ({
	props: { ctrl: { type: Object } },
	events: ['bundle:create'],
})
