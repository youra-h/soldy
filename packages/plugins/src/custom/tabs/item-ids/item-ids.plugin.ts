import type { ITabsItem } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TTabsItemIdsPlugin — связка «таб ↔ панель» в документе со стороны таба.
 *
 * Пишет в `aria` таба его `id` и `aria-controls` — `id` его панели. Обе
 * половины связки — от монтирования таба (`createId`), формула одна. Панель
 * своей формулы не держит: проводка `Tabs.Content`
 * (`TTabsContentBindingExtension`) берёт оба значения у таба, которого нашла
 * по `value`, — `id` себе из `aria-controls`, `aria-labelledby` из `id`.
 *
 * `id` — от монтирования, а не от экземпляра: он нужен только документу, и на
 * сервере и в браузере обязан совпасть. Таб из данных рисуется с готовым
 * экземпляром (`ctrl`), и его конструктор адаптер не зовёт, а монтирование у
 * него своё. Пишется при установке, синхронно, — связка таба есть уже в
 * первой (и серверной) отрисовке. Плата: `aria-controls` стоит и тогда, когда
 * `Tabs.Content` в разметке нет вовсе; в паттерне вкладок панель обязательна.
 */
export class TTabsItemIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const tab = ctx.getInstance<ITabsItem>()

		if (!tab) return

		tab.aria.add('id', ctx.createId('tab'))
		tab.aria.add('aria-controls', ctx.createId('panel'))
	}
}
