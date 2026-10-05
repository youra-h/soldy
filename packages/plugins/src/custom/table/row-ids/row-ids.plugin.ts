import type { ITableRow } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TTableRowIdsPlugin — имя строки таблицы в документе: `id` её заголовка.
 *
 * Заголовок строки — ячейка колонки `rowHeader`, и по её тексту строку
 * называют: чекбокс выбора строки ссылается на неё (`aria-labelledby`). Своего
 * экземпляра у ячейки нет, поэтому `id` уходит в набор строки `headerAria`, а
 * на ячейку набор кладёт проекция ячеек — только у первой показанной колонки
 * заголовка. Ссылку чекбокса строит она же (`rowHeaderId`), поэтому формула
 * одна — здесь.
 *
 * `id` — от монтирования строки (`createId`), а не от экземпляра: он нужен
 * только документу, и на сервере и в браузере обязан совпасть. Строку таблица
 * рисует с готовым экземпляром (`ctrl`), и его конструктор адаптер не зовёт, а
 * монтирование у неё своё. Пишется при установке, синхронно, — имя есть уже в
 * первой (и серверной) отрисовке.
 */
export class TTableRowIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const row = ctx.getInstance<ITableRow>()

		if (!row) return

		row.headerAria.add('id', ctx.createId('header'))
	}
}
