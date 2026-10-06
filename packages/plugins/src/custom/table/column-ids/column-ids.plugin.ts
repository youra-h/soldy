import type { ITableColumn } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TTableColumnIdsPlugin — имя заголовка колонки и её ручки в документе.
 *
 * Своё имя у заголовка браузер собрал бы из всего содержимого ячейки, а в ней
 * стоит и поле ручки ширины (`input type="range"`): значение встроенного
 * контрола входит в имя (accname 1.2), и заголовок звался бы «Имя 150».
 * Поэтому заголовок назван своим содержимым явно — ссылкой на его обёртку, — и
 * той же ссылкой назван ползунок ручки: имя у обоих — ровно текст колонки,
 * без строк библиотеки.
 *
 * Всё — в наборах колонки: `id` — в `contentAria` (он стоит на обёртке
 * содержимого), ссылка — в `aria` (на заголовке) и в `resizerAria` (на поле
 * ручки). Формула одна, здесь.
 *
 * `id` — от монтирования заголовка (`createId`), а не от экземпляра: он нужен
 * только документу, и на сервере и в браузере обязан совпасть. Колонку таблица
 * рисует с готовым экземпляром (`ctrl`), и его конструктор адаптер не зовёт, а
 * монтирование у неё своё. Пишется при установке, синхронно, — имя есть уже в
 * первой (и серверной) отрисовке.
 */
export class TTableColumnIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const column = ctx.getInstance<ITableColumn>()

		if (!column) return

		const contentId = ctx.createId('content')

		column.contentAria.add('id', contentId)
		column.aria.add('aria-labelledby', contentId)
		column.resizerAria.add('aria-labelledby', contentId)
	}
}
