import type { IContribution } from '@soldy/accessor'

/**
 * `ctrl` и `bundle:create` — обе половины связки адаптера с инстансом, поэтому
 * живут вместе: `ctrl` вносит готовый инстанс снаружи, `bundle:create` отдаёт
 * наружу плагины, появившиеся у этого инстанса при монтировании.
 *
 * `embedded` — имя места, если компонент — деталь разметки другого компонента
 * soldy. Как и `ctrl`, проп адаптера, а не инстанса: триггеров нет, в инстанс
 * он не пишется. Читает его `createAdapterContext` — для реестра плагинов.
 */
export const EntityContribution = (): IContribution => ({
	props: { ctrl: { type: Object }, embedded: { type: String } },
	events: ['bundle:create'],
})
