import { TBaseExtension } from '../../../../../../base/collection'
import type { IExtension, IExtensionContext } from '../../../../../../base/collection'
import type { ITableColumn } from '../../../types'
import type { TTableColumnsVisibilityEvents } from './types'

/**
 * Скрытая колонка не показана: в выборку коллекции (`batch.shown`) попадают
 * только видимые колонки, в своём порядке.
 *
 * Отбор на выдаче, как у `filter`: хранилище не трогается, скрытая колонка
 * остаётся в составе (`batch.items`) со своим местом и шириной и
 * возвращается на то же место, когда её покажут. Поэтому «какие колонки
 * показаны» у коллекции колонок одно — её выборка.
 *
 * Видимость — свойство колонки, а не условие отбора: меняет её сама колонка.
 * Поэтому расширение слушает `change:visible` каждой колонки, пока она лежит
 * в коллекции, и на смену сообщает, что выборка устарела. Удалённую колонку
 * оно больше не слушает: подписка удерживала бы коллекцию, пока жива сама
 * колонка, а её скрытие сбрасывало бы выборку, в которой её уже нет.
 */
export class TTableColumnsVisibilityExtension
	extends TBaseExtension<ITableColumn, TTableColumnsVisibilityEvents>
	implements IExtension<ITableColumn, TTableColumnsVisibilityEvents>
{
	readonly name = 'visibility' as const

	/** Обработчики `change:visible` — по колонке, пока она в коллекции. */
	private readonly _watchers = new Map<ITableColumn, () => void>()

	override install(ctx: IExtensionContext<ITableColumn>): void {
		super.install(ctx)

		ctx.driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((column) => column.visible)
		})

		// Кого слушать, решает состав: на каждую его смену подписки сверяются с
		// ним. Очистка и патч приходят сюда одним событием на операцию
		ctx.driver.events.on('change:items', (columns) => this._watch(columns))

		// Догон: движок могли наполнить до установки расширения
		this._watch(ctx.driver.valueOf())
	}

	/** Слушать колонки состава, а ушедшие из него — больше не слушать. */
	private _watch(columns: readonly ITableColumn[]): void {
		const stored = new Set(columns)

		for (const [column, watcher] of this._watchers) {
			if (stored.has(column)) continue

			column.events.off('change:visible', watcher)
			this._watchers.delete(column)
		}

		for (const column of columns) {
			if (this._watchers.has(column)) continue

			const watcher = (): void => this._ctx.driver.invalidateQuery()

			this._watchers.set(column, watcher)
			column.events.on('change:visible', watcher)
		}
	}
}
