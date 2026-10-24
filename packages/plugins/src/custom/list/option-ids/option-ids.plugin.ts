import type { IComponentView } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IListenable, IPluginContext } from '../../../base'

/**
 * Что плагину нужно от элемента: набор его строки, свой `id` и канал о его
 * смене. Структурный тип, а не `IListBoxItem`: тот же плагин стоит и на опции
 * Select, а общего предка со своим `id` у них нет — есть только общий контракт.
 */
interface IOptionIdsOwner extends Pick<IComponentView, 'aria'> {
	readonly id: string | undefined
	readonly events: IListenable<{ 'change:id': (value: string | undefined) => void }>
}

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
 * **Свой `id` элемента главнее** (`id` — вход элемента, значение
 * потребителя): он и встаёт на строку, и на него ведёт ссылка. Атрибутом мимо
 * набора `id` на строку не попадает — адаптеры отдают его входу, — поэтому на
 * строке он один. Сменили — плагин переписывает набор, и клавиатура списка
 * ведёт ссылку за ним (она следит за набором подсвеченного элемента). Сняли —
 * снова `id` от монтирования.
 *
 * Без своего — `id` от монтирования элемента (`createId`), а не от экземпляра.
 * Элемент из данных рисуется с готовым экземпляром (`ctrl`), и его конструктор
 * адаптер не зовёт, а монтирование у него своё. Пишется при установке,
 * синхронно, — `id` есть уже в первой (и серверной) отрисовке.
 *
 * Шина элемента бывает долговечнее плагина — приложение передаёт свой `ctrl`,
 * а элемент из данных переживает своё монтирование, — поэтому подписка через
 * `_listenTo`.
 */
export class TOptionIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const item = ctx.getInstance<IOptionIdsOwner>()

		if (!item) return

		const mountId = ctx.createId('option')
		const write = (): void => {
			item.aria.add('id', item.id ?? mountId)
		}

		write()
		this._listenTo(item.events, 'change:id', write)
	}
}
