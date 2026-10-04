import type { IDatePicker } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TDatePickerIdsPlugin — связка «кнопка календаря ↔ панель» DatePicker в
 * документе.
 *
 * `id` панели — в `panelAria`, который разметка раскладывает на панель, и
 * ссылка на него `aria-controls` — в `triggerAria` кнопки. Обе стороны
 * пишутся здесь, от одного `id`: формула одна на обе, как у Popover.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * `aria-controls` стоит и у закрытой панели: она всегда в документе,
 * закрытие её только прячет.
 */
export class TDatePickerIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const picker = ctx.getInstance<IDatePicker>()

		if (!picker) return

		const panelId = ctx.createId('panel')

		picker.panelAria.add('id', panelId)
		picker.triggerAria.add('aria-controls', panelId)
	}
}
