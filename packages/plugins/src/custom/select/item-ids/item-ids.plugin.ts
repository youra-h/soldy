import type { ISelectItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TSelectItemIdsPlugin — `id` опции Select в документе: на него ссылается
 * `aria-activedescendant` поля, пока опция подсвечена.
 *
 * Пишется в `aria` опции — набор её строки, — и клавиатура Select
 * (`TSelectKeyboardPlugin`) берёт его оттуда же: ссылка получает ровно то, что
 * стоит в разметке.
 *
 * `id` — от монтирования опции (`createId`), а не от экземпляра. Опция из
 * данных рисуется с готовым экземпляром (`ctrl`), и его конструктор адаптер не
 * зовёт, а монтирование у неё своё. Пишется при установке, синхронно, — `id`
 * есть уже в первой (и серверной) отрисовке.
 */
export class TSelectItemIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		ctx.getInstance<ISelectItem>()?.aria.add('id', ctx.createId('option'))
	}
}
