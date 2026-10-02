import type { TCalendarCollection } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TCollectionBundlesPlugin } from '../../collection'

/**
 * TCalendarIdsPlugin — имена сеток календаря в документе: сетку называет её
 * заголовок.
 *
 * На каждом месте сетки пишет `id` заголовка и ссылку на него
 * `aria-labelledby` у таблицы — в наборы места (`gridSets` вида), которые вид
 * раскладывает в `grids`. Место, а не месяц: листание меняет месяц сетки, а
 * заголовок, его `id` и живая область остаются. Месяцев стало больше —
 * новым местам пишется то же (`change:months`, а сменившееся до принятия
 * набора — при принятии).
 *
 * `id` — от монтирования календаря (`createId`), а не от экземпляра: он нужен
 * только документу, и на сервере и в браузере обязан совпасть. Движок
 * привязывается при сборке (`engine:bound`), до первой отрисовки, — имена
 * сеток есть уже в серверной разметке.
 */
export class TCalendarIdsPlugin extends TBasePlugin {
	/** Назвать сетки на всех местах; `null` — движок ещё не привязан. */
	private _name: (() => void) | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		ctx.get(TCollectionBundlesPlugin)?.events.on(
			'engine:bound',
			(engine: TCalendarCollection) => {
				const view = engine.extensions.view
				const name = (): void => {
					view.months.forEach((_, index) => {
						const titleId = ctx.createId(`title-${index}`)
						const sets = view.gridSets(index)

						sets.title.add('id', titleId)
						sets.grid.add('aria-labelledby', titleId)
					})
				}

				this._name = name

				name()
				this._listenTo(view.events, 'change:months', name)
			},
		)
	}

	/** Месяцы, сменившиеся до принятия, подписка не застала — назвать новые места. */
	override attach(): void {
		super.attach()

		this._name?.()
	}

	override destroy(): void {
		this._name = null

		super.destroy()
	}
}
