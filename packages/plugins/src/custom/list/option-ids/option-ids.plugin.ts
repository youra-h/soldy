import type { IComponentView } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TOptionIdsPlugin — `id` элемента списка в документе: опции Select и элемента
 * ListBox. На него ссылается `aria-activedescendant` узла с фокусом, пока
 * элемент подсвечен: у Select — поля комбобокса, у ListBox — узла списка.
 *
 * Плагин один на оба списка: `id` от роли элемента и модели фокуса не зависит,
 * а копия под каждый компонент стала бы вторым путём к тому же знанию. Чей
 * узел ссылается на элемент, решает клавиатура списка — наследник
 * `TListNavigationPlugin`.
 *
 * Пишется в `aria` элемента — набор его строки, — и клавиатура списка берёт
 * его оттуда же (`highlightedId` навигации): ссылка получает ровно то, что
 * стоит в разметке.
 *
 * `id` — от монтирования элемента (`createId`), а не от экземпляра. Элемент из
 * данных рисуется с готовым экземпляром (`ctrl`), и его конструктор адаптер не
 * зовёт, а монтирование у него своё. Пишется при установке, синхронно, — `id`
 * есть уже в первой (и серверной) отрисовке.
 */
export class TOptionIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		ctx.getInstance<IComponentView>()?.aria.add('id', ctx.createId('option'))
	}
}
