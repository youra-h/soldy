import type { IMenu } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'

/**
 * TMenuIdsPlugin — связка «кнопка ↔ меню» в документе (APG Menu Button).
 *
 * Обе стороны ссылаются друг на друга: у триггера — `id` и `aria-controls`
 * на панель (`triggerAria`), у панели — `id` и `aria-labelledby` на триггер
 * (`aria` меню, его разметка раскладывает на панель). Имя меню — текст
 * кнопки: скринридер объявляет «Действия, меню». Пишутся обе стороны здесь,
 * от двух `id` одного монтирования: формула одна на обе.
 *
 * `id` — от монтирования (`createId`), а не от экземпляра: он нужен только
 * документу, и на сервере и в браузере обязан совпасть. Пишется при
 * установке, синхронно, — связка есть уже в первой (и серверной) отрисовке.
 * Ссылки стоят и у закрытого меню: панель всегда в документе, закрытие её
 * только прячет.
 */
export class TMenuIdsPlugin extends TBasePlugin {
	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const menu = ctx.getInstance<IMenu>()

		if (!menu) return

		const triggerId = ctx.createId('trigger')
		const panelId = ctx.createId('panel')

		menu.triggerAria.add('id', triggerId)
		menu.triggerAria.add('aria-controls', panelId)

		menu.aria.add('id', panelId)
		menu.aria.add('aria-labelledby', triggerId)
	}
}
