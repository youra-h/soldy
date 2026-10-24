import type { IComponentView } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TIdPlugin } from '../../id'

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
 * `id`, заданный приложением (`TIdPlugin` элемента), главнее: он и встаёт на
 * строку, и на него ведёт ссылка. Сменили — плагин переписывает набор, и
 * клавиатура списка ведёт ссылку за ним (она следит за набором подсвеченного
 * элемента). Сняли — снова `id` от монтирования.
 *
 * Без него — `id` от монтирования элемента (`createId`), а не от экземпляра.
 * Элемент из данных рисуется с готовым экземпляром (`ctrl`), и его конструктор
 * адаптер не зовёт, а монтирование у него своё. Пишется при установке,
 * синхронно, — `id` есть уже в первой (и серверной) отрисовке.
 */
export class TOptionIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const item = ctx.getInstance<IComponentView>()

		if (!item) return

		const idPlugin = ctx.get(TIdPlugin)
		const mountId = ctx.createId('option')
		const write = (): void => {
			item.aria.add('id', idPlugin?.id ?? mountId)
		}

		write()
		idPlugin?.events.on('change:id', write)
	}
}
