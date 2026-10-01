import type { IPopover } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TPopoverIdsPlugin — связка «триггер ↔ панель» поповера в документе.
 *
 * `id` панели — в `aria` поповера, который разметка раскладывает на панель, и
 * ссылка на него `aria-controls` — в `triggerAria` триггера. Обе стороны
 * пишутся здесь, от одного `id`: формула одна на обе.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * `aria-controls` стоит и у закрытой панели: она всегда в документе,
 * закрытие её только прячет.
 */
export class TPopoverIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const popover = ctx.getInstance<IPopover>()

		if (!popover) return

		const panelId = ctx.createId('panel')

		popover.aria.add('id', panelId)
		popover.triggerAria.add('aria-controls', panelId)
	}
}
