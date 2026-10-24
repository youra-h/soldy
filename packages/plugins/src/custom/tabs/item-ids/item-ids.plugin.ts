import type { ITabsItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TTabsItemIdsPlugin — связка «таб ↔ панель» в документе со стороны таба.
 *
 * Пишет в `aria` таба его `id` и `aria-controls` — `id` его панели. Панель
 * своей формулы не держит: проводка `Tabs.Content`
 * (`TTabsContentBindingExtension`) берёт оба значения у таба, которого нашла
 * по `value`, — `id` себе из `aria-controls`, `aria-labelledby` из `id` — и
 * идёт за ними на каждую смену набора таба (`change:aria`).
 *
 * **Свой `id` таба главнее** (`id` — вход таба, значение потребителя): он и
 * встаёт на строку таба, и на него ссылается панель. Атрибутом мимо набора
 * `id` на строку не попадает — адаптеры отдают его входу, — поэтому на строке
 * он один. Сменили — плагин переписывает набор, и панель идёт следом. Сняли —
 * снова `id` от монтирования. `id` панели своего входа не имеет и остаётся
 * формулой.
 *
 * Без своего — `id` от монтирования, а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Таб из данных
 * рисуется с готовым экземпляром (`ctrl`), и его конструктор адаптер не зовёт,
 * а монтирование у него своё. Пишется при установке, синхронно, — связка таба
 * есть уже в первой (и серверной) отрисовке. Плата: `aria-controls` стоит и
 * тогда, когда `Tabs.Content` в разметке нет вовсе; в паттерне вкладок панель
 * обязательна.
 *
 * Шина таба бывает долговечнее плагина — приложение передаёт свой `ctrl`, а
 * таб из данных переживает своё монтирование, — поэтому подписка через
 * `_listenTo`.
 */
export class TTabsItemIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const tab = ctx.getInstance<ITabsItem>()

		if (!tab) return

		const mountId = ctx.createId('tab')
		const write = (): void => {
			tab.aria.add('id', tab.id ?? mountId)
		}

		write()
		tab.aria.add('aria-controls', ctx.createId('panel'))

		this._listenTo(tab.events, 'change:id', write)
	}
}
